import { Router, Request, Response } from "express";
import type { Store } from "redux";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";

export function createEvaluationRoutes(store: Store): Router {
  const router = Router();

  /**
   * POST /eval/setup
   *
   * Dispatches START_EVALUATION to trigger EvaluationsSaga initialization:
   * - Starts the eval worker_thread
   * - Calls SETUP on the worker
   * - Enters the eval loop waiting for trigger actions
   */
  router.post("/eval/setup", (_req: Request, res: Response) => {
    try {
      // Pre-dispatch actions that the eval saga waits for, since their
      // corresponding sagas aren't running in Phase 3
      store.dispatch({
        type: ReduxActionTypes.FETCH_FEATURE_FLAGS_SUCCESS,
        payload: {},
      });
      store.dispatch({
        type: ReduxActionTypes.WIDGET_INIT_SUCCESS,
      });

      store.dispatch({ type: ReduxActionTypes.START_EVALUATION });
      res.json({
        success: true,
        message: "Evaluation saga started. Worker initializing.",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /eval/tree
   *
   * Triggers a full DataTree evaluation by dispatching FETCH_ALL_PAGE_ENTITY_COMPLETION
   * (which is in FIRST_EVAL_REDUX_ACTIONS and EVAL_AND_LINT_REDUX_ACTIONS).
   * Waits for evaluations.tree to be populated, then returns the result.
   *
   * Query params:
   *   ?timeout=<ms>  — max wait time (default 30000)
   */
  router.post("/eval/tree", (req: Request, res: Response) => {
    const timeout = parseInt(req.query.timeout as string) || 30000;
    const startTime = Date.now();

    const currentTree = (store.getState() as any).evaluations?.tree;
    const currentTreeEmpty =
      !currentTree || Object.keys(currentTree).length === 0;

    store.dispatch({
      type: ReduxActionTypes.FETCH_ALL_PAGE_ENTITY_COMPLETION,
    });

    let responded = false;
    const checkInterval = setInterval(() => {
      if (responded) { clearInterval(checkInterval); return; }
      const tree = (store.getState() as any).evaluations?.tree;
      const elapsed = Date.now() - startTime;

      if (elapsed > timeout) {
        responded = true; clearInterval(checkInterval);
        res.json({ success: true, timedOut: true, elapsed, tree: tree || {} });
        return;
      }
      if (currentTreeEmpty && tree && Object.keys(tree).length > 0) {
        responded = true; clearInterval(checkInterval);
        res.json({ success: true, elapsed: Date.now() - startTime, tree });
        return;
      }
      if (!currentTreeEmpty && tree !== currentTree) {
        responded = true; clearInterval(checkInterval);
        res.json({ success: true, elapsed: Date.now() - startTime, tree });
        return;
      }
    }, 100);

    // Clean up interval if client disconnects
    req.on("close", () => {
      if (!responded) { responded = true; clearInterval(checkInterval); }
    });
  });

  return router;
}
