import { get, identity, pickBy } from "lodash";
import {
  all,
  call,
  delay,
  fork,
  put,
  race,
  select,
  take,
  takeEvery,
  takeLatest,
  takeLeading,
} from "redux-saga/effects";
import type {
  ApplicationPayload,
  Page,
  ReduxAction,
  ReduxActionWithoutPayload,
} from "@appsmith/constants/ReduxActionConstants";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { resetApplicationWidgets, resetPageList } from "actions/pageActions";
import { resetCurrentApplication } from "@appsmith/actions/applicationActions";
import log from "loglevel";
import { resetRecentEntities } from "actions/globalSearchActions";

import {
  initAppViewer,
  initEditor,
  resetEditorSuccess,
} from "actions/initActions";
import {
  getCurrentPageId,
  getIsEditorInitialized,
  getIsWidgetConfigBuilt,
  selectCurrentApplicationSlug,
  getCurrentApplicationId,
} from "selectors/editorSelectors";
import { getIsInitialized as getIsViewerInitialized } from "selectors/appViewSelectors";
import { setPreviewModeAction } from "actions/editorActions";
import type { AppEnginePayload } from "entities/Engine";
import { PageNotFoundError } from "entities/Engine";
import type AppEngine from "entities/Engine";
import { AppEngineApiError } from "entities/Engine";
import AppEngineFactory from "entities/Engine/factory";
import type {
  ApplicationPagePayload,
  FetchApplicationResponse,
} from "@appsmith/api/ApplicationApi";
import { getSearchQuery, updateSlugNamesInURL } from "utils/helpers";
import { generateAutoHeightLayoutTreeAction } from "actions/autoHeightActions";
import { safeCrashAppRequest } from "../actions/errorActions";
import { resetSnipingMode } from "actions/propertyPaneActions";
import {
  setExplorerActiveAction,
  setExplorerPinnedAction,
} from "actions/explorerActions";
import {
  isEditorPath,
  isViewerPath,
  matchEditorPath,
} from "@appsmith/pages/Editor/Explorer/helpers";
import { APP_MODE } from "../entities/App";
import { GIT_BRANCH_QUERY_KEY, matchViewerPath } from "../constants/routes";
import AnalyticsUtil from "@appsmith/utils/AnalyticsUtil";
import { getAppMode } from "@appsmith/selectors/applicationSelectors";
import { handleStoreOperations } from "./ActionExecution/StoreActionSaga";
import PerformanceTracker from "utils/PerformanceTracker";
import { getDebuggerErrors } from "selectors/debuggerSelectors";
import { deleteErrorLog } from "actions/debuggerActions";
import { getCurrentUser } from "actions/authActions";

import { getCurrentTenant } from "@appsmith/actions/tenantActions";
import {
  fetchFeatureFlagsInit,
  fetchProductAlertInit,
} from "actions/userActions";
import { embedRedirectURL, validateResponse } from "./ErrorSagas";
import type { ApiResponse } from "api/ApiResponses";
import type { ProductAlert } from "reducers/uiReducers/usersReducer";
import type { FeatureFlags } from "@appsmith/entities/FeatureFlag";
import type { Action, ActionViewMode } from "entities/Action";
import type { JSCollection } from "entities/JSCollection";
import type { FetchPageResponse, FetchPageResponseData } from "api/PageApi";
import type { AppTheme } from "entities/AppTheming";
import type { Datasource } from "entities/Datasource";
import type { Plugin, PluginFormPayload } from "api/PluginApi";
import ConsolidatedPageLoadApi from "api/ConsolidatedPageLoadApi";
import { axiosConnectionAbortedCode } from "@appsmith/api/ApiUtils";
import globalStore from "utils/GlobalStore";
import {
  getEvalMode,
  getHomepageTextConfig,
  getPageContext,
} from "selectors/onboardingSelectors";
import { getUnevaluatedDataTree } from "selectors/dataTreeSelectors";
import { getPageInfo } from "selectors/pageSelectors";
import type { PageItem } from "@appsmith/reducers/pagesReducer";
// import { useSelector } from "react-redux";
export const URL_CHANGE_ACTIONS = [
  ReduxActionTypes.CURRENT_APPLICATION_NAME_UPDATE,
  ReduxActionTypes.UPDATE_PAGE_SUCCESS,
  ReduxActionTypes.UPDATE_APPLICATION_SUCCESS,
];

export interface ReduxURLChangeAction {
  type: typeof URL_CHANGE_ACTIONS;
  payload: ApplicationPagePayload | ApplicationPayload | Page;
}
export interface DeployConsolidatedApi {
  productAlert: ApiResponse<ProductAlert>;
  tenantConfig: ApiResponse;
  featureFlags: ApiResponse<FeatureFlags>;
  userProfile: ApiResponse;
  pages: FetchApplicationResponse;
  publishedActions: ApiResponse<ActionViewMode[]>;
  publishedActionCollections: ApiResponse<JSCollection[]>;
  customJSLibraries: ApiResponse;
  pageWithMigratedDsl: FetchPageResponse;
  currentTheme: ApiResponse<AppTheme[]>;
  themes: ApiResponse<AppTheme>;
}
export interface EditConsolidatedApi {
  productAlert: ApiResponse<ProductAlert>;
  tenantConfig: ApiResponse;
  featureFlags: ApiResponse<FeatureFlags>;
  userProfile: ApiResponse;
  pages: FetchApplicationResponse;
  publishedActions: ApiResponse<ActionViewMode[]>;
  publishedActionCollections: ApiResponse<JSCollection[]>;
  customJSLibraries: ApiResponse;
  pageWithMigratedDsl: FetchPageResponse;
  currentTheme: ApiResponse<AppTheme[]>;
  themes: ApiResponse<AppTheme>;
  datasources: ApiResponse<Datasource[]>;
  pagesWithMigratedDsl: ApiResponse<FetchPageResponseData[]>;
  plugins: ApiResponse<Plugin[]>;
  mockDatasources: ApiResponse;
  pluginFormConfigs: ApiResponse<PluginFormPayload>[];
  unpublishedActions: ApiResponse<Action[]>;
  unpublishedActionCollections: ApiResponse<JSCollection[]>;
}
export type InitConsolidatedApi = DeployConsolidatedApi | EditConsolidatedApi;
export function* failFastApiCalls(
  triggerActions: Array<ReduxAction<unknown> | ReduxActionWithoutPayload>,
  successActions: string[],
  failureActions: string[],
) {
  yield all(triggerActions.map((triggerAction) => put(triggerAction)));
  const effectRaceResult: { success: boolean; failure: boolean } = yield race({
    success: all(successActions.map((successAction) => take(successAction))),
    failure: take(failureActions),
  });
  if (effectRaceResult.failure) {
    yield put(
      safeCrashAppRequest(get(effectRaceResult, "failure.payload.error.code")),
    );
    return false;
  }
  return true;
}

export function* waitForWidgetConfigBuild() {
  // TODO: 【临时修改】不加载前端widget组件
  return;
  const isBuilt: boolean = yield select(getIsWidgetConfigBuilt);
  if (!isBuilt) {
    yield take(ReduxActionTypes.WIDGET_INIT_SUCCESS);
  }
}

export function* reportSWStatus() {
  // Node.js: Service Worker API not available
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const mode: APP_MODE = yield select(getAppMode);
  const startTime = Date.now();
  if ("serviceWorker" in navigator) {
    const result: { success: any; failed: any } = yield race({
      success: navigator.serviceWorker.ready.then((reg) => ({
        reg,
        timeTaken: Date.now() - startTime,
      })),
      failed: delay(20000),
    });
    if (result.success) {
      AnalyticsUtil.logEvent("SW_REGISTRATION_SUCCESS", {
        message: "Service worker is active",
        mode,
        timeTaken: result.success.timeTaken,
      });
    } else {
      AnalyticsUtil.logEvent("SW_REGISTRATION_FAILED", {
        message: "Service worker is not active in 20s",
        mode,
      });
    }
  } else {
    AnalyticsUtil.logEvent("SW_REGISTRATION_FAILED", {
      message: "Service worker is not supported",
      mode,
    });
  }
}

function* executeActionDuringUserDetailsInitialisation(
  actionType: string,
  shouldInitialiseUserDetails?: boolean,
) {
  if (!shouldInitialiseUserDetails) {
    return;
  }
  yield put({ type: actionType });
}

export function* getInitResponses({
  applicationId,
  mode,
  pageId,
  shouldInitialiseUserDetails,
  pageContext: actionPageContext,
}: {
  applicationId?: string;
  pageId?: string;
  branch?: string;
  mode?: APP_MODE;
  shouldInitialiseUserDetails?: boolean;
  pageContext?: any;
}): any {
  const params = pickBy(
    {
      applicationId,
      defaultPageId: pageId,
      viewPageId: pageId,
    },
    identity,
  );
  let response: InitConsolidatedApi | undefined;
  const evalMode = yield select(getEvalMode);
  try {
    yield call(
      executeActionDuringUserDetailsInitialisation,
      ReduxActionTypes.START_CONSOLIDATED_PAGE_LOAD,
      shouldInitialiseUserDetails,
    );
    // const rxdb = globalStore.get("OffLineInstance");
    // yield rxdb.removeData("OffLineInstance", {
    //   key1: "page",
    //   key2: "id",
    //   key3: "pageApiData",
    // });

    // const initRxdbInfo = async () => {
    //   let a = await rxdb.queryData("OffLineInstance", {
    //     key1: "page",
    //     key2: "id",
    //     key3: "pageApiData",
    //   });
    //   console.log("数据缓存2------qqqqqqq");
    //   return a;
    // };
    // let initConsolidatedApiResponse: ApiResponse<InitConsolidatedApi> =
    //   (yield initRxdbInfo())?.sql_res?.[0]?.value;
    // if (!initConsolidatedApiResponse) {
    // const evalMode = yield select(getEvalMode);
    // const evalMode = store.getState().ui.onBoarding.evalMode;
    let initConsolidatedApiResponse: ApiResponse<InitConsolidatedApi>;
    if (evalMode) {
      //改
      const pageContext = yield select(getPageContext);
      // initConsolidatedApiResponse = store.getState().ui.onBoarding.pageContext;

      initConsolidatedApiResponse = yield mode === APP_MODE.EDIT
        ? ConsolidatedPageLoadApi.getConsolidatedPageLoadDataEdit(params)
        : // : ConsolidatedPageLoadApi.getConsolidatedPageLoadDataView(params);
          pageContext;
    } else {
      if (actionPageContext) {
        initConsolidatedApiResponse = actionPageContext;
      } else {
        initConsolidatedApiResponse = yield mode === APP_MODE.EDIT
          ? ConsolidatedPageLoadApi.getConsolidatedPageLoadDataEdit(params)
          : ConsolidatedPageLoadApi.getConsolidatedPageLoadDataView(params);
      }
    }
    const isValidResponse: boolean = yield validateResponse(
      initConsolidatedApiResponse,
    );
    response = initConsolidatedApiResponse.data;
    const theme = response?.currentTheme?.data?.name || "SkyBlue";
    if (!evalMode && mode === APP_MODE.PUBLISHED && pageId) {
      //请求拿取配置接口
      const params = {
        pageId,
        theme,
      };
      const respondConfig =
        yield ConsolidatedPageLoadApi.getPageConfigData(params);
      //拿到数据判断是否存在
      const configData = respondConfig.data;
      let dataObj = {};
      if (!configData) {
        //构造数据
        dataObj = {
          status: false,
          pageId,
          setFirstDataMap: {},
          contextTree: {},
          theme,
        };
      } else {
        dataObj = {
          status: true,
          pageData: configData.contextTree, //evalTree
          pageId,
          setFirstDataMap: configData.setFirstData, //setUpInit
        };
      }

      //先清缓存
      // const rxdb = globalStore.get("OffLineInstance");
      // const handleData = async (dataObj: any) => {
      //   await rxdb.removeData("OffLineInstance", {
      //     key1: "page",
      //     key2: "id",
      //     key3: pageId,
      //   });
      //   console.log("=====hhh");
      //   await rxdb.insertData("OffLineInstance", [
      //     {
      //       key1: "page",
      //       key2: "id",
      //       key3: pageId,
      //       value: dataObj,
      //     },
      //   ]);
      // };
      // yield handleData(dataObj);
    }

    if (!isValidResponse) {
      // its only invalid when there is a axios related error
      throw new Error("Error occured " + axiosConnectionAbortedCode);
    }
  } catch (e: any) {
    // when the user is an anonymous user we embed the url with the attempted route
    // this is taken care in ce code repo but not on ee
    if (e?.response?.status === 401) {
      embedRedirectURL();
    }

    yield call(
      executeActionDuringUserDetailsInitialisation,
      ReduxActionTypes.END_CONSOLIDATED_PAGE_LOAD,
      shouldInitialiseUserDetails,
    );

    console.warn(
      `consolidated api failure for ${JSON.stringify(
        params,
      )} errored message response ${e}`,
    );
    throw new PageNotFoundError(`Cannot find page with id: ${pageId}`);
  }

  const {
    featureFlags,
    productAlert,
    tenantConfig,
    userProfile,
    ...rest
  } =
    response || {};
  let _tenantConfig = tenantConfig as any;
  //actions originating from INITIALIZE_CURRENT_PAGE should update user details
  //other actions are not necessary

  if (!shouldInitialiseUserDetails) {
    return rest;
  }

  yield put(getCurrentUser(userProfile));

  yield put(fetchFeatureFlagsInit(featureFlags));

  // 发布页不需要
  if (evalMode) {
    _tenantConfig = {
      data: {
        tenantConfiguration: {},
      },
      errorDisplay: "",
      responseMeta: {
        success: true,
        status: 200,
      },
    };
  }

  yield put(getCurrentTenant(false, _tenantConfig));

  yield put(fetchProductAlertInit(productAlert));
  yield call(
    executeActionDuringUserDetailsInitialisation,
    ReduxActionTypes.END_CONSOLIDATED_PAGE_LOAD,
    shouldInitialiseUserDetails,
  );
  return rest;
}

let uuid = 1;

export function* startAppEngine(action: ReduxAction<AppEnginePayload>) {
  const __key = `startAppEngine_${uuid++}`;
  try {
    console.time(__key);
    PerformanceTracker.startAsyncTracking(
      "aync !!!!!!!!!!!! startAppEngine ~ executePageLoadAction",
    );
    const engine: AppEngine = AppEngineFactory.create(
      action.payload.mode,
      action.payload.mode,
    );
    engine.startPerformanceTracking();
    yield call(engine.setupEngine, action.payload);
    PerformanceTracker.startAsyncTracking("!!!!!!loadAppData");
    const allResponses: InitConsolidatedApi = yield call(getInitResponses, {
      ...action.payload,
    });
    yield put({ type: ReduxActionTypes.LINT_SETUP });
    const { applicationId, toLoadPageId } = yield call(
      engine.loadAppData,
      action.payload,
      allResponses,
    );
    PerformanceTracker.stopAsyncTracking("!!!!!!loadAppData");
    const pageInfo: PageItem = yield select(getPageInfo);
    // 查看模式下子页面不更新页面路由
    if (!pageInfo.ps || pageInfo.isRootPage) {
      yield call(engine.loadAppURL, toLoadPageId, action.payload.pageId);
    }
    PerformanceTracker.startAsyncTracking("!!!!!!loadAppEntities");
    yield call(
      engine.loadAppEntities,
      toLoadPageId,
      applicationId,
      allResponses,
    );
    PerformanceTracker.stopAsyncTracking("!!!!!!loadAppEntities");
    yield call(engine.loadGit, applicationId);
    yield call(engine.completeChore);
    yield put(generateAutoHeightLayoutTreeAction(true, false));
    engine.stopPerformanceTracking();
    console.log("aync !!!!!!!!!!!! startAppEngine ~ evalFirstTree", Date.now());
    yield put({ type: ReduxActionTypes.NODE_INIT_EDITOR_SUCCESS });
  } catch (e) {
    log.error(e);
    console.error("[startAppEngine]", (e as any)?.message || e);
    // Node.js: always dispatch crash so business routes can detect failure
    yield put(safeCrashAppRequest());
  }
  console.timeEnd(__key);
}

export function* resetDebuggerLogs() {
  // clear all existing debugger errors
  const debuggerErrors: ReturnType<typeof getDebuggerErrors> =
    yield select(getDebuggerErrors);
  const existingErrors = Object.values(debuggerErrors).filter(
    (payload) => !!payload.id,
  );
  const errorsToDelete = existingErrors.map(
    (payload) => payload.id,
  ) as string[];
  yield put(deleteErrorLog(errorsToDelete));
}

function* resetEditorSaga() {
  yield put(resetCurrentApplication());
  yield put(resetPageList());
  yield put(resetApplicationWidgets());
  yield put(resetRecentEntities());
  // Reset to edit mode once user exits editor
  // Without doing this if the user creates a new app they
  // might end up in preview mode if they were in preview mode
  // previously
  yield put(setPreviewModeAction(false));
  yield put(resetSnipingMode());
  yield put(setExplorerActiveAction(true));
  yield put(setExplorerPinnedAction(true));
  yield put(resetEditorSuccess());
  yield fork(resetDebuggerLogs);
}

export function* waitForInit() {
  const isEditorInitialised: boolean = yield select(getIsEditorInitialized);
  const isViewerInitialized: boolean = yield select(getIsViewerInitialized);
  if (!isEditorInitialised && !isViewerInitialized) {
    yield take([
      ReduxActionTypes.INITIALIZE_EDITOR_SUCCESS,
      ReduxActionTypes.INITIALIZE_PAGE_VIEWER_SUCCESS,
    ]);
  }
}

function* updateURLSaga(action: ReduxURLChangeAction) {
  yield call(waitForInit);
  const currentPageId: string = yield select(getCurrentPageId);
  const applicationSlug: string = yield select(selectCurrentApplicationSlug);
  const payload = action.payload;

  if ("applicationVersion" in payload) {
    updateSlugNamesInURL({ applicationSlug: payload.slug });
    return;
  }
  if ("pageId" in payload) {
    if (payload.pageId !== currentPageId) return;
    updateSlugNamesInURL({
      pageSlug: payload.slug,
      customSlug: payload.customSlug || "",
      applicationSlug,
    });
    return;
  }
  if (payload.id !== currentPageId) return;
  updateSlugNamesInURL({
    pageSlug: payload.slug,
    customSlug: payload.customSlug || "",
    applicationSlug,
  });
}

function* appEngineSaga(action: ReduxAction<AppEnginePayload>) {
  yield race({
    task: call(startAppEngine, action),
    cancel: take(ReduxActionTypes.RESET_EDITOR_REQUEST),
  });
}

function* eagerPageInitSaga(action: any) {
  const url = window.location.pathname;
  const search = window.location.search;
  if (isEditorPath(url)) {
    const branch = getSearchQuery(search, GIT_BRANCH_QUERY_KEY);

    // 签入签出，编辑态其他元素（jsObject, query, datasource）编辑时刷新页面
    if (!matchEditorPath(url)) {
      const currentPageId: string = yield select(getCurrentPageId);
      const currentApplicationId: string = yield select(
        getCurrentApplicationId,
      );
      if (currentApplicationId && currentPageId) {
        yield put(
          initEditor({
            pageId: currentPageId,
            applicationId: currentApplicationId,
            branch,
            mode: APP_MODE.EDIT,
            shouldInitialiseUserDetails: true,
          }),
        );
      }
      return;
    }

    const matchedEditorParams = matchEditorPath(url);
    if (matchedEditorParams) {
      const {
        params: { applicationId, pageId },
      } = matchedEditorParams;
      if (pageId) {
        yield put(
          initEditor({
            pageId,
            applicationId,
            branch,
            mode: APP_MODE.EDIT,
            shouldInitialiseUserDetails: true,
          }),
        );
        return;
      }
    }
  } else if (isViewerPath(url)) {
    const matchedViewerParams = matchViewerPath(url);
    if (matchedViewerParams) {
      const {
        // params: { applicationId, pageId },
        params: { applicationId },
      } = matchedViewerParams;
      const pageId =
        action.payload?.pageId || matchedViewerParams.params.pageId;
      const branch = getSearchQuery(search, GIT_BRANCH_QUERY_KEY);
      if (applicationId || pageId) {
        yield put(
          initAppViewer({
            applicationId,
            branch,
            pageId,
            mode: APP_MODE.PUBLISHED,
            shouldInitialiseUserDetails: true,
          }),
        );
        return;
      }
    }
  }

  try {
    yield call(getInitResponses, {
      shouldInitialiseUserDetails: true,
      mode: APP_MODE.PUBLISHED,
    });
  } catch (e) {}
}

function* staticStoreValueSaga(action: ReduxAction<any>) {
  yield fork(handleStoreOperations, [
    { type: "STORE_VALUE", payload: action.payload },
  ]);
}

export default function* watchInitSagas() {
  yield all([
    takeLeading(
      [
        ReduxActionTypes.INITIALIZE_EDITOR,
        ReduxActionTypes.INITIALIZE_PAGE_VIEWER,
      ],
      appEngineSaga,
    ),
    takeLatest(ReduxActionTypes.RESET_EDITOR_REQUEST, resetEditorSaga),
    takeEvery(URL_CHANGE_ACTIONS, updateURLSaga),
    takeEvery(ReduxActionTypes.INITIALIZE_CURRENT_PAGE, eagerPageInitSaga),
    takeLatest(ReduxActionTypes.STORE_VALUE_STATIC, staticStoreValueSaga),
  ]);
}
