/**
 * 业务路由 — 聚合业务动作。
 *
 * 统一返回格式：
 *   { success: boolean, message: string, result: any }
 *   - success: 是否成功
 *   - message: 成功时为空字符串，失败时为失败原因
 *   - result: 接口结果
 */
import { Router, Request, Response } from "express";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { getJSCollectionDataById } from "selectors/editorSelectors";
import { ok, fail } from "../utils/response";
import { ErrorCode } from "../utils/error-codes";

export function createBusinessRoutes(): Router {
  const router = Router();

  /**
   * POST /sessions/:id/biz/init — 初始化业务
   *
   * 请求体：
   *   - pageId (string, 必填): 页面 ID
   *   - pageContext (object, 必填): 页面上下文数据（可使用 mock/initData.json）
   *
   * 流程：
   *   1. dispatch INITIALIZE_EDITOR
   *   2. 竞速等待 NODE_INIT_EDITOR_SUCCESS 或 SAFE_CRASH_APPSMITH_REQUEST
   *   3. 成功返回初始化结果，失败返回错误信息
   */
  router.post("/sessions/:id/biz/init", async (req: Request, res: Response) => {
    const { store } = (req as any).session;
    const allOfOrRace = (req as any).allOfOrRace;

    const { pageId, pageContext } = req.body || {};
    if (!pageId) {
      return fail(res, "pageId 为必填参数", ErrorCode.MISSING_PARAM);
    }
    if (!pageContext) {
      return fail(res, "pageContext 为必填参数", ErrorCode.MISSING_PARAM);
    }

    // 1. 先注册 listener（必须在 dispatch 之前，否则同步 saga 响应会丢失）
    //    同时监听 NODE_INIT_EDITOR_SUCCESS 和 UPDATE_IS_INIT_END 才算成功
    //    监听到 SAFE_CRASH_APPSMITH_REQUEST 则立即判定失败
    const resultPromise = allOfOrRace(
      [
        { actionType: ReduxActionTypes.NODE_INIT_EDITOR_SUCCESS },
        { actionType: ReduxActionTypes.UPDATE_IS_INIT_END },
      ],
      [
        { actionType: ReduxActionTypes.SAFE_CRASH_APPSMITH_REQUEST },
      ],
      { timeout: 120000 },
    );

    // 不加载datasource
    if (pageContext.data?.datasources?.data) {
      pageContext.data.datasources.data = [];
    }

    // 2. dispatch 初始化 action
    store.dispatch({
      type: ReduxActionTypes.INITIALIZE_EDITOR,
      payload: {
        pageId,
        mode: "EDIT",
        shouldInitialiseUserDetails: true,
        pageContext,
      },
    });

    // 3. 等待结果
    try {
      const result = await resultPromise;

      if (result.outcome === "all") {
        return ok(res, "初始化成功");
      } else {
        const msg = result.failAction?.payload?.message || "初始化异常";
        return fail(res, msg, ErrorCode.INIT_CRASH);
      }
    } catch (e: any) {
      return fail(res, `初始化超时: ${e.message}`, ErrorCode.TIMEOUT);
    }
  });

  /**
   * POST /sessions/:id/biz/update/js-action — 更新 JS Action body
   *
   * 请求体：
   *   - id (string, 必填): JS Collection ID
   *   - body (string, 必填): 新的 body 内容
   *
   * 逻辑：
   *   1. 通过 getJSCollectionDataById 获取当前 body
   *   2. 比较是否有变更（isEdit）
   *   3. 若有变更：dispatch UPDATE_JS_ACTION_BODY_INIT，等待 NODE_UPDATE_JS_BODY_SUCCESS/ERROR
   *   4. 若无变更：直接返回 { edit: false, httpActions: [] }
   */
  router.post(
    "/sessions/:id/biz/update/js-action",
    async (req: Request, res: Response) => {
      const { store } = (req as any).session;
      const raceForAction = (req as any).raceForAction;
      const { id, body } = req.body || {};

      if (!id) {
        return fail(res, "id 为必填参数", ErrorCode.MISSING_PARAM);
      }
      if (body === undefined || body === null) {
        return fail(res, "body 为必填参数", ErrorCode.MISSING_PARAM);
      }

      const state = store.getState();
      const jsCollectionData = getJSCollectionDataById(state, id);

      if (!jsCollectionData) {
        return fail(
          res,
          `未找到 id 为 ${id} 的 JS Collection`,
          ErrorCode.JS_COLLECTION_NOT_FOUND,
        );
      }

      const currentBody = jsCollectionData.config?.body ?? "";
      const isEdit = currentBody !== body;

      if (!isEdit) {
        return ok(res, { edit: false, httpActions: [] });
      }

      // 有变更，dispatch 并等待结果
      const racePromise = raceForAction(
        [
          { actionType: ReduxActionTypes.NODE_UPDATE_JS_BODY_SUCCESS },
          { actionType: ReduxActionTypes.NODE_UPDATE_JS_BODY_ERROR },
        ],
        { timeout: 30000 },
      );

      store.dispatch({
        type: ReduxActionTypes.UPDATE_JS_ACTION_BODY_INIT,
        payload: { id, body, isReplay: false },
      });

      try {
        const result = await racePromise;

        if (result.type === ReduxActionTypes.NODE_UPDATE_JS_BODY_SUCCESS) {
          return ok(res, { edit: true, httpActions: result.payload });
        } else {
          return fail(
            res,
            result.payload?.message || "更新 JS Action body 失败",
            ErrorCode.INTERNAL_ERROR,
          );
        }
      } catch (e: any) {
        return fail(res, `更新超时: ${e.message}`, ErrorCode.TIMEOUT);
      }
    },
  );

  return router;
}
