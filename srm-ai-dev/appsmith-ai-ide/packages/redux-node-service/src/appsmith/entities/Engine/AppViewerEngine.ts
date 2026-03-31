import {
  fetchAllPageEntityCompletion,
  setupPublishedPage,
} from "actions/pageActions";
import {
  executePageLoadActions,
  fetchActionsForView,
} from "actions/pluginActionActions";
import {
  ReduxActionErrorTypes,
  ReduxActionTypes,
} from "@appsmith/constants/ReduxActionConstants";
import type { APP_MODE } from "entities/App";
import { call, put, spawn, select } from "redux-saga/effects";
import type { DeployConsolidatedApi } from "sagas/InitSagas";
import {
  failFastApiCalls,
  reportSWStatus,
  waitForWidgetConfigBuild,
} from "sagas/InitSagas";
import PerformanceTracker, {
  PerformanceTransactionName,
} from "utils/PerformanceTracker";
import type { AppEnginePayload } from ".";
import AppEngine, { ActionsNotFoundError } from ".";
import { fetchJSLibraries } from "actions/JSLibraryActions";
import {
  waitForSegmentInit,
  waitForFetchUserSuccess,
} from "@appsmith/sagas/userSagas";
import { waitForFetchEnvironments } from "@appsmith/sagas/EnvironmentSagas";
import { fetchJSCollectionsForView } from "actions/jsActionActions";
import {
  fetchAppThemesAction,
  fetchSelectedAppThemeAction,
} from "actions/appThemingActions";
import { getEvalMode, getUpdates } from "selectors/onboardingSelectors";
import {
  getMetaDataTree,
  getUnevaluatedDataTree,
} from "selectors/dataTreeSelectors";
import { sendSocketMessage } from "pages/AppViewer/AppViewSocket/AppViewSocket";

export default class AppViewerEngine extends AppEngine {
  constructor(mode: APP_MODE) {
    super(mode);
    this.setupEngine = this.setupEngine.bind(this);
    this.loadAppData = this.loadAppData.bind(this);
    this.loadAppURL = this.loadAppURL.bind(this);
    this.loadAppEntities = this.loadAppEntities.bind(this);
    this.loadGit = this.loadGit.bind(this);
    this.completeChore = this.completeChore.bind(this);
  }

  *loadGit() {
    return;
  }

  *completeChore() {
    yield call(waitForWidgetConfigBuild);
    yield put({
      type: ReduxActionTypes.INITIALIZE_PAGE_VIEWER_SUCCESS,
    });
    yield spawn(reportSWStatus);
  }

  *setupEngine(payload: AppEnginePayload) {
    yield call(super.setupEngine.bind(this), payload);
  }

  startPerformanceTracking() {
    PerformanceTracker.startAsyncTracking(
      PerformanceTransactionName.INIT_VIEW_APP,
    );
  }

  stopPerformanceTracking() {
    PerformanceTracker.stopAsyncTracking(
      PerformanceTransactionName.INIT_VIEW_APP,
    );
  }

  *loadAppEntities(
    toLoadPageId: string,
    applicationId: string,
    allResponses: DeployConsolidatedApi,
  ): any {
    const {
      currentTheme,
      customJSLibraries,
      pageWithMigratedDsl,
      // publishedActionCollections,
      // publishedActions,
      // themes,
    } = allResponses;

    // 发布页不需要
    const publishedActions = {
      data: [],
      errorDisplay: "",
      responseMeta: {
        status: 200,
        success: true,
      },
    }
    const publishedActionCollections = {
      data: [],
      errorDisplay: "",
      responseMeta: {
        status: 200,
        success: true,
      },
    }
    const themes = {
      data: [] as any,
      errorDisplay: "",
      responseMeta: {
        status: 200,
        success: true,
      },
    }

    const initActionsCalls: any = [
      // 新增传参pageId : toLoadPageId
      fetchActionsForView({
        applicationId,
        publishedActions,
        pageId: toLoadPageId,
      }),
      fetchJSCollectionsForView({
        applicationId,
        publishedActionCollections,
        pageId: toLoadPageId,
      }),
      fetchSelectedAppThemeAction(applicationId, currentTheme),
      fetchAppThemesAction(applicationId, themes),
      setupPublishedPage(toLoadPageId, true, true, pageWithMigratedDsl),
    ];

    const successActionEffects = [
      ReduxActionTypes.FETCH_ACTIONS_VIEW_MODE_SUCCESS,
      ReduxActionTypes.FETCH_JS_ACTIONS_VIEW_MODE_SUCCESS,
      ReduxActionTypes.FETCH_APP_THEMES_SUCCESS,
      ReduxActionTypes.FETCH_SELECTED_APP_THEME_SUCCESS,
      ReduxActionTypes.SETUP_PUBLISHED_PAGE_SUCCESS,
    ];
    const failureActionEffects = [
      ReduxActionErrorTypes.FETCH_ACTIONS_VIEW_MODE_ERROR,
      ReduxActionErrorTypes.FETCH_JS_ACTIONS_VIEW_MODE_ERROR,
      ReduxActionErrorTypes.FETCH_APP_THEMES_ERROR,
      ReduxActionErrorTypes.FETCH_SELECTED_APP_THEME_ERROR,
      ReduxActionErrorTypes.SETUP_PUBLISHED_PAGE_ERROR,
    ];

    const evalMode: any = yield select(getEvalMode);
    // evalMode模式不通过worker加载js libraries
    if (!evalMode) {
      initActionsCalls.push(fetchJSLibraries(applicationId, customJSLibraries));
      successActionEffects.push(ReduxActionTypes.FETCH_JS_LIBRARIES_SUCCESS);
      failureActionEffects.push(ReduxActionErrorTypes.FETCH_JS_LIBRARIES_FAILED);
    }

    const resultOfPrimaryCalls: boolean = yield failFastApiCalls(
      initActionsCalls,
      successActionEffects,
      failureActionEffects,
    );

    if (!resultOfPrimaryCalls)
      throw new ActionsNotFoundError(
        `Unable to fetch actions for the application: ${applicationId}`,
      );

    yield call(waitForFetchUserSuccess);
    // yield call(waitForSegmentInit, true);
    // yield call(waitForFetchEnvironments);
    // evalMode模式不通过worker
    if (evalMode) {
      const updates: any = yield select(getUpdates);
      //组件的metadata初始化
      const metaData: any = yield select(getMetaDataTree);
      const initData = updates.updates[0].rhs;
      // console.log("initData====iiii", initData);
      // console.log("metaData====iiii", metaData);

      const updateFields: any[] = [];
      Object.keys(metaData).forEach((widgetName) => {
        Object.keys(metaData[widgetName])?.forEach((metaName) => {
          if (!initData[widgetName]?.hasOwnProperty(metaName)) {
            const path = widgetName + "." + metaName;
            const value = metaData[widgetName][metaName];
            updateFields.push({ [path]: value });
          }
        });
      });
      const params = {
        messageId: uuid4(), //请求消息编码 一般有返回值的时候会用到
        body: {
          updateFields,
        },
        type: "UPDATE_PROPS",
      };
      // console.log("metaData====iiii=params", updateFields);
      yield call(sendSocketMessage, params);
      yield put({
        type: ReduxActionTypes.SET_UPDATES,
        payload: { updates: undefined },
      });

      yield put(executePageLoadActions());
    } else {
      yield put(fetchAllPageEntityCompletion([executePageLoadActions()]));
    }
  }
}
