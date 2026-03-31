import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import type {
  EventType,
  ExecuteTriggerPayload,
  TriggerSource,
} from "constants/AppsmithActionConstants/ActionConstants";
import { TriggerKind } from "constants/AppsmithActionConstants/ActionConstants";
import * as log from "loglevel";
import {
  all,
  call,
  put,
  takeEvery,
  takeLatest,
  select,
} from "redux-saga/effects";
import {
  evaluateActionSelectorFieldSaga,
  evaluateAndExecuteDynamicTrigger,
  setAppVersionOnWorkerSaga,
} from "sagas/EvaluationsSaga";
import navigateActionSaga from "sagas/ActionExecution/NavigateActionSaga";
import getWidgetsActionSaga from "sagas/ActionExecution/GetWidgetsActionSaga";
import {
  setToolbarSaga,
  setBrowserSaga,
  getToolbarSaga,
} from "sagas/ActionExecution/GlobalLayoutSaga";
import downloadSaga from "sagas/ActionExecution/DownloadActionSaga";
import { setLoadingSaga } from "sagas/ActionExecution/SetLoadingActionSaga";
// 修改处
import { showQuerySaga } from "sagas/ActionExecution/ShowQueryActionSaga";
import { closeQuerySaga } from "sagas/ActionExecution/CloseQueryActionSaga";
import { showMessageSaga } from "sagas/ActionExecution/ShowMessageActionSaga";
import { showMaterialsSaga } from "sagas/ActionExecution/showMaterialsActionSaga";

import { showPrintSaga } from "sagas/ActionExecution/ShowPrintActionSaga";
import { closePrintSaga } from "sagas/ActionExecution/ClosePrintActionSaga";

import copySaga from "sagas/ActionExecution/CopyActionSaga";
import resetWidgetActionSaga from "sagas/ActionExecution/ResetWidgetActionSaga";
import operateWidgetActionSaga from "sagas/ActionExecution/OperateWidgetActionSaga";
import operateWidgetActionSyncSaga from "sagas/ActionExecution/OperateWidgetActionSyncSaga";
import showAlertSaga from "sagas/ActionExecution/ShowAlertActionSaga";
import executePluginActionTriggerSaga from "sagas/ActionExecution/PluginActionSaga";
import {
  clearActionResponse,
  updateActionData,
} from "actions/pluginActionActions";
import {
  closeModalSaga,
  openModalSaga,
} from "sagas/ActionExecution/ModalSagas";
import AppsmithConsole from "utils/AppsmithConsole";
import {
  getCurrentLocationSaga,
  stopWatchCurrentLocation,
  watchCurrentLocation,
} from "sagas/ActionExecution/geolocationSaga";
import { postMessageSaga } from "sagas/ActionExecution/PostMessageSaga";
// 修改处
import {
  listenWindowMessage,
  unlistenWindowMessage,
} from "sagas/ActionExecution/MessageListenerSaga";
import type { ActionDescription } from "@appsmith/workers/Evaluation/fns";
import { getActionById } from "selectors/editorSelectors";
import type { AppState } from "@appsmith/reducers";
import { sendSocketMessage } from "pages/AppViewer/AppViewSocket/AppViewSocket";
import { getEvalMode } from "selectors/onboardingSelectors";
import { showCommonDialogSaga } from "sagas/ActionExecution/ShowCommonDialogActionSaga";
import { showProgressBarSaga } from "sagas/ActionExecution/ShowProgressBarActionSaga";

export interface TriggerMeta {
  source?: TriggerSource;
  triggerPropertyName?: string;
  triggerKind?: TriggerKind;
  onPageLoad: boolean;
}
// 修改：系统全局方法调用（后端调）
function* executeActionTriggersExecution(action: any): any {
  try {
    const result: any = yield call(
      executeActionTriggers,
      action.trigger,
      action.eventType,
      action.triggerMeta,
    );
    action["result"] = result;
    action?.resolve?.(result);
    return result;
  } catch (error) {
    if (action?.reject) {
      action?.reject(error);
    } else {
      throw error;
    }
  }
}
/**
 * The controller saga that routes different trigger effects to its executor sagas
 * @param trigger The trigger information with trigger type
 * @param eventType Widget/Platform event which triggered this action
 * @param triggerMeta Where the trigger originated from
 */
export function* executeActionTriggers(
  trigger: ActionDescription,
  eventType: EventType,
  triggerMeta: TriggerMeta,
): any {
  // if (trigger.type === "EXECUTE_ACTION_TRIGGERS") {
  //   eventType = trigger?.eventType;
  //   triggerMeta = trigger?.triggerMeta;
  //   trigger = trigger?.trigger;
  // }
  // when called via a promise, a trigger can return some value to be used in .then
  let response: unknown[] = [];
  switch (trigger.type) {
    case "RUN_PLUGIN_ACTION":
      response = yield call(executePluginActionTriggerSaga, trigger, eventType);
      break;
    case "CLEAR_PLUGIN_ACTION":
      yield put(clearActionResponse(trigger.payload.actionId));
      const action: ReturnType<typeof getActionById> = yield select(
        (state: AppState) =>
          getActionById(state, {
            match: {
              params: {
                apiId: trigger.payload.actionId,
              },
            },
          }),
      );
      if (action) {
        yield put(
          updateActionData([
            {
              entityName: action.name,
              dataPath: "data",
              data: undefined,
            },
          ]),
        );
      }
      break;
    case "NAVIGATE_TO":
      yield call(navigateActionSaga, trigger);
      break;
    case "GET_WIDGETS":
      response = yield call(getWidgetsActionSaga);
      break;
    case "SET_TOOLBAR":
      yield call(setToolbarSaga, trigger);
      break;
    case "GET_TOOLBAR":
      response = yield call(getToolbarSaga);
      break;
    case "SET_BROWSER":
      yield call(setBrowserSaga, trigger);
      break;
    case "SET_LOADING":
      yield call(setLoadingSaga, trigger.payload);
      break;
    case "SHOW_PROGRESS_BAR":
      yield call(showProgressBarSaga, trigger.payload);
      break;
    // 修改处
    case "SHOW_QUERY":
      yield call(showQuerySaga, { params: trigger.payload });
      break;
    case "CLOSE_QUERY":
      yield call(closeQuerySaga, trigger.payload);
      break;
    case "SHOW_COMMON_DIALOG":
      yield call(showCommonDialogSaga, trigger.payload);
      break;
    case "SHOW_MESSAGE":
      yield call(showMessageSaga, trigger.payload);
      break;
    case "SHOW_MATERIALS":
      yield call(showMaterialsSaga, trigger.payload);
      break;
    case "SHOW_PRINT":
      yield call(showPrintSaga, trigger.payload);
      break;
    case "CLOSE_PRINT":
      yield call(closePrintSaga, trigger.payload);
      break;
    case "SHOW_ALERT":
      yield call(showAlertSaga, trigger);
      break;
    case "SHOW_MODAL_BY_NAME":
      yield call(openModalSaga, trigger);
      break;
    case "CLOSE_MODAL":
      yield call(closeModalSaga, trigger);
      break;
    case "DOWNLOAD":
      yield call(downloadSaga, trigger);
      break;
    case "COPY_TO_CLIPBOARD":
      yield call(copySaga, trigger);
      break;
    case "RESET_WIDGET_META_RECURSIVE_BY_NAME":
      yield call(resetWidgetActionSaga, trigger);
      break;
    case "OPERATE_WIDGET_BY_NAME":
      response = yield call(operateWidgetActionSaga, trigger);
      break;
    case "OPERATE_WIDGET_BY_NAME_SYNC":
      response = yield call(operateWidgetActionSyncSaga, trigger);
      break;
    case "GET_CURRENT_LOCATION":
      response = yield call(getCurrentLocationSaga, trigger);
      break;
    case "WATCH_CURRENT_LOCATION":
      response = yield call(
        watchCurrentLocation,
        trigger,
        eventType,
        triggerMeta,
      );
      break;
    case "STOP_WATCHING_CURRENT_LOCATION":
      response = yield call(stopWatchCurrentLocation);
      break;
    case "POST_MESSAGE":
      yield call(postMessageSaga, trigger);
      break;
    case "WINDOW_MESSAGE_LISTENER":
      response = yield call(
        listenWindowMessage,
        trigger,
        eventType,
        triggerMeta,
      );
      break;
    case "UNLISTEN_WINDOW_MESSAGE":
      response = yield call(
        unlistenWindowMessage,
        trigger,
        eventType,
        triggerMeta,
      );
      break;
    default:
      log.error("Trigger type unknown", trigger);
      throw Error("Trigger type unknown");
  }
  return response;
}

// This function gets called when a user clicks on a button on the canvas UI
export function* executeAppAction(payload: ExecuteTriggerPayload): any {
  const {
    callbackData,
    dynamicString,
    event: { type },
    globalContext,
    source,
    triggerPropertyName,
  } = payload;

  log.debug({ dynamicString, callbackData, globalContext });
  if (dynamicString === undefined) {
    throw new Error("Executing undefined action");
  }

  return yield call(
    evaluateAndExecuteDynamicTrigger,
    dynamicString,
    type,
    {
      source,
      triggerPropertyName,
      triggerKind: TriggerKind.EVENT_EXECUTION,
      onPageLoad: false,
    },
    callbackData,
    globalContext,
  );
}
// 调用一个空方法
function* ationTriggerExecutionNoWork(action: any): any {
  // console.log()
}
function* initiateActionTriggerExecution(
  action: ReduxAction<ExecuteTriggerPayload>,
) {
  const { event, source, triggerPropertyName } = action.payload;
  // Clear all error for this action trigger. In case the error still exists,
  // it will be created again while execution
  AppsmithConsole.deleteErrors([
    { id: `${source?.id}-${triggerPropertyName}` },
  ]);
  try {
    yield call(executeAppAction, action.payload);
    if (event.callback) {
      event.callback({ success: true });
    }
  } catch (e) {
    if (event.callback) {
      event.callback({ success: false });
    }
    log.error(e);
  }
}

function* actionTriggerExecutionSync(action: any): any {
  const { onSuccess } = action.payload;
  // const evalMode = store.getState().ui.onBoarding.evalMode;
  const evalMode = yield select(getEvalMode);
  if (evalMode) {
    const params = {
      messageId: uuid4(), //请求消息编码 一般有返回值的时候会用到
      body: {
        methodName: action.payload.triggerPropertyName, //如果不在方法树中就直接执行
        methodString: action.payload.dynamicString, //如果不在方法树中就直接执行
        type: action.payload.event.type, //目前没用
      },
      type: "JS_EXECUTION",
      needResult: true,
    };

    const result: any = yield call(sendSocketMessage, params);
    onSuccess && onSuccess(result);
  } else {
    const result: any = yield call(executeAppAction, action.payload);
    onSuccess && onSuccess(result);
  }
}

export function* watchActionExecutionSagas() {
  yield all([
    takeEvery(
      ReduxActionTypes.EXECUTE_TRIGGER_NOWORK,
      ationTriggerExecutionNoWork,
    ),
    takeEvery(
      ReduxActionTypes.EXECUTE_TRIGGER_REQUEST,
      initiateActionTriggerExecution,
    ),
    takeEvery(
      ReduxActionTypes.EXECUTE_TRIGGER_REQUEST_SYNC,
      actionTriggerExecutionSync,
    ),
    takeLatest(
      ReduxActionTypes.SET_APP_VERSION_ON_WORKER,
      setAppVersionOnWorkerSaga,
    ),
    takeLatest(
      ReduxActionTypes.EVALUATE_ACTION_SELECTOR_FIELD,
      evaluateActionSelectorFieldSaga,
    ),
    // 修改：调用系统全局方法
    takeEvery(
      ReduxActionTypes.EXECUTE_ACTION_TRIGGERS,
      executeActionTriggersExecution,
    ),
  ]);
}
