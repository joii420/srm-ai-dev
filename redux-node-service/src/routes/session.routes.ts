import { Router, Request, Response, NextFunction } from "express";
import { sessionManager } from "../sessions/session-manager";
import { createSessionStoreSafe } from "../sessions/session-store";
import { createSessionEvaluator } from "../sessions/session-evaluator";
import { runWithStore } from "../adapters/storeContext";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { ok, fail } from "../utils/response";
import { ErrorCode } from "../utils/error-codes";

export function createSessionRoutes(): Router {
  const router = Router();

  // --- Session lifecycle ---

  router.post("/sessions", async (req: Request, res: Response) => {
    let evalWorker: ReturnType<typeof createSessionEvaluator> | null = null;
    try {
      const { authToken = "", backendUrl = "" } = req.body || {};
      evalWorker = createSessionEvaluator();
      const { store, sagaTask, actionWaiter } = await createSessionStoreSafe(evalWorker);

      const session = sessionManager.createSession({
        store, sagaTask, evalWorker, actionWaiter, authToken, backendUrl,
      });

      ok(res, { sessionId: session.id, createdAt: session.createdAt });
    } catch (err: any) {
      // 释放未使用的预热 Worker，防止泄漏
      evalWorker?.dispose();
      fail(res, err.message, ErrorCode.SESSION_CREATE_FAILED);
    }
  });

  router.get("/sessions", (_req: Request, res: Response) => {
    ok(res, sessionManager.listSessions());
  });

  router.delete("/sessions/:id", async (req: Request, res: Response) => {
    const destroyed = await sessionManager.destroySession(req.params.id);
    if (!destroyed) {
      return fail(res, "Session not found", ErrorCode.SESSION_NOT_FOUND);
    }
    ok(res, null);
  });

  // --- Session middleware ---

  router.use("/sessions/:id", (req: Request, res: Response, next: NextFunction) => {
    const session = sessionManager.getSession(req.params.id);
    if (!session) {
      return fail(res, `Session ${req.params.id} not found`, ErrorCode.SESSION_NOT_FOUND);
    }
    (req as any).session = session;
    (req as any).waitForAction = session.actionWaiter.waitForAction;
    (req as any).raceForAction = session.actionWaiter.raceForAction;
    (req as any).allOfOrRace = session.actionWaiter.allOfOrRace;
    runWithStore(session.store, () => next());
  });

  // --- State ---

  router.get("/sessions/:id/state", (req: Request, res: Response) => {
    ok(res, (req as any).session.store.getState());
  });

  router.get("/sessions/:id/state/:slice", (req: Request, res: Response) => {
    const slice = ((req as any).session.store.getState() as any)[req.params.slice];
    if (slice === undefined) return fail(res, `Slice "${req.params.slice}" not found`, ErrorCode.SLICE_NOT_FOUND);
    ok(res, slice);
  });

  router.get("/sessions/:id/state/:slice/:sub", (req: Request, res: Response) => {
    const state = (req as any).session.store.getState() as any;
    const slice = state[req.params.slice];
    if (!slice) return fail(res, `Slice "${req.params.slice}" not found`, ErrorCode.SLICE_NOT_FOUND);
    const sub = slice[req.params.sub];
    if (sub === undefined) return fail(res, `Sub-slice "${req.params.sub}" not found`, ErrorCode.SLICE_NOT_FOUND);
    ok(res, sub);
  });

  // --- Dispatch ---

  router.post("/sessions/:id/dispatch", (req: Request, res: Response) => {
    const action = req.body;
    if (!action || !action.type) return fail(res, 'Action must have a "type" field', ErrorCode.ACTION_INVALID);
    (req as any).session.store.dispatch(action);
    ok(res, null);
  });

  router.post("/sessions/:id/dispatch-batch", (req: Request, res: Response) => {
    const { actions } = req.body;
    if (!Array.isArray(actions)) return fail(res, 'Body must have an "actions" array', ErrorCode.ACTION_INVALID);
    for (const action of actions) {
      if (!action || !action.type) return fail(res, 'Each action must have a "type" field', ErrorCode.ACTION_INVALID);
      (req as any).session.store.dispatch(action);
    }
    ok(res, { dispatched: actions.length });
  });

  // --- Eval ---

  router.post("/sessions/:id/eval/setup", (req: Request, res: Response) => {
    try {
      const store = (req as any).session.store;
      store.dispatch({ type: ReduxActionTypes.FETCH_FEATURE_FLAGS_SUCCESS, payload: {} });
      store.dispatch({ type: ReduxActionTypes.WIDGET_INIT_SUCCESS });
      store.dispatch({ type: ReduxActionTypes.START_EVALUATION });
      ok(res, "Evaluation setup started");
    } catch (err: any) {
      fail(res, err.message, ErrorCode.EVAL_ERROR);
    }
  });

  router.post("/sessions/:id/eval/tree", (req: Request, res: Response) => {
    const store = (req as any).session.store;
    const timeout = parseInt(req.query.timeout as string) || 30000;
    const startTime = Date.now();
    const currentTree = (store.getState() as any).evaluations?.tree;
    const currentTreeEmpty = !currentTree || Object.keys(currentTree).length === 0;

    store.dispatch({ type: ReduxActionTypes.FETCH_ALL_PAGE_ENTITY_COMPLETION });

    let responded = false;
    const finish = () => {
      if (responded) return;
      responded = true;
      clearInterval(checkInterval);
    };

    const checkInterval = setInterval(() => {
      if (responded) { clearInterval(checkInterval); return; }
      const tree = (store.getState() as any).evaluations?.tree;
      const elapsed = Date.now() - startTime;

      try {
        if (elapsed > timeout) {
          finish();
          ok(res, { timedOut: true, elapsed, tree: tree || {} });
          return;
        }
        if (currentTreeEmpty && tree && Object.keys(tree).length > 0) {
          finish();
          ok(res, { elapsed: Date.now() - startTime, tree });
          return;
        }
        if (!currentTreeEmpty && tree !== currentTree) {
          finish();
          ok(res, { elapsed: Date.now() - startTime, tree });
          return;
        }
      } catch (err: any) {
        // res.json() 可能因连接已关闭而抛异常，确保 interval 被清除
        finish();
      }
    }, 100);

    req.on("close", finish);
  });

  router.post("/sessions/:id/eval/expression", (req: Request, res: Response) => {
    const { expression } = req.body || {};
    if (!expression) return fail(res, "expression is required", ErrorCode.MISSING_PARAM);
    (req as any).session.store.dispatch({
      type: ReduxActionTypes.EVAL_SINGLE_EXPRESSION,
      payload: { expression },
    });
    ok(res, { expression, dispatched: true });
  });

  router.post("/sessions/:id/eval/trigger", (req: Request, res: Response) => {
    const { trigger, eventType, triggerMeta } = req.body || {};
    if (!trigger) return fail(res, "trigger is required", ErrorCode.MISSING_PARAM);
    (req as any).session.store.dispatch({
      type: "EXECUTE_TRIGGER",
      payload: { trigger, eventType, triggerMeta },
    });
    ok(res, { trigger, dispatched: true });
  });

  router.post("/sessions/:id/eval/validate", (req: Request, res: Response) => {
    const { property, value, props, validation } = req.body || {};
    if (!property) return fail(res, "property is required", ErrorCode.MISSING_PARAM);
    (req as any).session.store.dispatch({
      type: "VALIDATE_PROPERTY",
      payload: { property, value, props, validation },
    });
    ok(res, { property, dispatched: true });
  });

  // --- Selector ---

  router.post("/sessions/:id/select", (req: Request, res: Response) => {
    const store = (req as any).session.store;
    const { selector: selectorName, args = [] } = req.body || {};
    if (!selectorName) return fail(res, "selector name is required", ErrorCode.MISSING_PARAM);

    const selectorRegistry: Record<string, (...a: any[]) => any> = {};
    try {
      const dt = require("selectors/dataTreeSelectors");
      const ed = require("selectors/editorSelectors");
      const en = require("@appsmith/selectors/entitiesSelector");
      Object.assign(selectorRegistry, {
        getDataTree: dt.getDataTree,
        getUnevaluatedDataTree: dt.getUnevaluatedDataTree,
        getWidgets: ed.getWidgets,
        getPageList: ed.getPageList,
        getCurrentPageId: ed.getCurrentPageId,
        getAppMode: en.getAppMode,
      });
    } catch {}

    const selectorFn = selectorRegistry[selectorName];
    if (!selectorFn) {
      return fail(res, `Selector "${selectorName}" not found. Available: ${Object.keys(selectorRegistry).join(", ")}`, ErrorCode.SELECTOR_NOT_FOUND);
    }

    try {
      ok(res, selectorFn(store.getState(), ...args));
    } catch (err: any) {
      fail(res, err.message, ErrorCode.SELECTOR_ERROR);
    }
  });

  // --- Saga ---

  router.post("/sessions/:id/saga/init", (req: Request, res: Response) => {
    const { applicationId, pageId } = req.body || {};
    if (!applicationId || !pageId) return fail(res, "applicationId and pageId are required", ErrorCode.MISSING_PARAM);
    (req as any).session.store.dispatch({
      type: ReduxActionTypes.INITIALIZE_EDITOR,
      payload: { applicationId, pageId },
    });
    ok(res, { dispatched: true });
  });

  router.post("/sessions/:id/saga/execute-action", (req: Request, res: Response) => {
    const { actionId, params } = req.body || {};
    if (!actionId) return fail(res, "actionId is required", ErrorCode.MISSING_PARAM);
    (req as any).session.store.dispatch({
      type: ReduxActionTypes.EXECUTE_PLUGIN_ACTION_REQUEST,
      payload: { id: actionId, params },
    });
    ok(res, { dispatched: true });
  });

  return router;
}
