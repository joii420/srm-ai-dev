import type {
  TNavigateToActionType,
  TNavigateToDescription,
} from "./navigateTo";
import navigateTo from "./navigateTo";
import type {
  TGetWidgetsActionType,
  TGetWidgetsDescription,
} from "./getWidgets";
import getWidgets from "./getWidgets";
import type {
  TSetToolbarActionType,
  TSetToolbarDescription,
  TSetBrowserActionType,
  TSetBrowserDescription,
  TGetToolbarDescription,
} from "./globalLayoutFns";
import { set_toolbar, set_browser, get_toolbar } from "./globalLayoutFns";
import type { TShowAlertActionType, TShowAlertDescription } from "./showAlert";
import showAlert from "./showAlert";
import type {
  TCloseModalActionType,
  TCloseModalDescription,
  TShowModalActionType,
  TShowModalDescription,
} from "./modalFns";
import { closeModal, showModal } from "./modalFns";
import type { TDownloadActionType, TDownloadDescription } from "./download";
import download from "./download";
import type {
  TPostWindowMessageActionType,
  TPostWindowMessageDescription,
} from "./postWindowMessage";
import postWindowMessage from "./postWindowMessage";
import type {
  TCopyToClipboardActionType,
  TCopyToClipboardDescription,
} from "./copyToClipboard";
import copyToClipboard from "./copyToClipboard";
import type {
  TResetWidgetActionType,
  TResetWidgetDescription,
} from "./resetWidget";
import resetWidget from "./resetWidget";
import type {
  TOperateWidgetActionType,
  TOperateWidgetDescription,
} from "./operateWidget";
import operateWidget from "./operateWidget";
import type {
  TOperateWidgetSyncActionType,
  TOperateWidgetSyncDescription,
} from "./operateWidgetSync";
import operateWidgetSync from "./operateWidgetSync";
import type {
  TClearStoreDescription,
  TRemoveValueDescription,
  TStoreValueDescription,
} from "./storeFns";
import { clearStore, removeValue, storeValue } from "./storeFns";
import type {
  TClearActionType,
  TClearDescription,
  TRunActionType,
  TRunDescription,
} from "./actionFns";
import run, { clear } from "./actionFns";
import { isAppsmithEntity } from "@appsmith/workers/Evaluation/evaluationUtils";
import type { ActionEntity } from "@appsmith/entities/DataTree/types";
import type { DataTreeEntity } from "entities/DataTree/dataTreeTypes";
import type {
  TGetGeoLocationActionType,
  TGetGeoLocationDescription,
  TStopWatchGeoLocationActionType,
  TStopWatchGeoLocationDescription,
  TWatchGeoLocationActionType,
  TWatchGeoLocationDescription,
} from "./geolocationFns";
import {
  getGeoLocation,
  stopWatchGeoLocation,
  watchGeoLocation,
} from "./geolocationFns";
import { getFnWithGuards, isAsyncGuard } from "./utils/fnGuard";
import { isRunNClearFnQualifierEntity } from "@appsmith/workers/Evaluation/fns/utils/isRunNClearFnQualifierEntity";
// 修改处
import type { TShowQueryActionType, TShowQueryDescription } from "./showQuery";
import showQuery from "./showQuery";
import type {
  TCloseQueryActionType,
  TCloseQueryDescription,
} from "./closeQuery";
import closeQuery from "./closeQuery";
import type {
  TShowMessageActionType,
  TShowMessageDescription,
} from "./showMessage";
import showMessage from "./showMessage";

import type { TShowPrintActionType, TShowPrintDescription } from "./showPrint";
import showPrint from "./showPrint";
import type {
  TClosePrintActionType,
  TClosePrintDescription,
} from "./closePrint";
import closePrint from "./closePrint";

import type {
  TListenMessageActionType,
  TListenMessageDescription,
  TUnlistenMessageActionType,
  TUnlistenMessageDescription,
} from "./messageListenerFns";
import { listenMessage, unlistenMessage } from "./messageListenerFns";
import type {
  TSetLoadingActionType,
  TSetLoadingDescription,
} from "./setLoading";
import setLoading from "./setLoading";
import type {
  TShowMaterialsActionType,
  TShowMaterialsDescription,
} from "./showMaterials";
import showMaterials from "./showMaterials";
import showCommonDialog, {
  TShowCommonDialogActionType,
  TShowCommonDialogDescription,
} from "./showCommonDialog";
import type {
  TShowProgressBarActionType,
  TShowProgressBarDescription,
} from "./showProgressBar";
import showProgressBar from "./showProgressBar";

export const getPlatformFunctions = () => {
  return platformFns;
};

export const getEntityFunctions = () => {
  return entityFns;
};

const platformFns = [
  {
    name: "navigateTo",
    fn: navigateTo,
  },
  {
    name: "getWidgets",
    fn: getWidgets,
  },
  {
    name: "set_toolbar",
    fn: set_toolbar,
  },
  {
    name: "get_toolbar",
    fn: get_toolbar,
  },
  {
    name: "set_browser",
    fn: set_browser,
  },
  {
    name: "setLoading",
    fn: setLoading,
  },
  // 修改处
  {
    name: "showProgressBar",
    fn: showProgressBar,
  },
  {
    name: "showQuery",
    fn: showQuery,
  },
  {
    name: "closeQuery",
    fn: closeQuery,
  },
  {
    name: "showCommonDialog",
    fn: showCommonDialog,
  },
  {
    name: "showMessage",
    fn: showMessage,
  },
  {
    name: "showMaterials",
    fn: showMaterials,
  },
  {
    name: "showPrint",
    fn: showPrint,
  },
  {
    name: "closePrint",
    fn: closePrint,
  },

  {
    name: "showAlert",
    fn: showAlert,
  },
  {
    name: "showModal",
    fn: showModal,
  },
  {
    name: "closeModal",
    fn: closeModal,
  },
  {
    name: "download",
    fn: download,
  },
  {
    name: "postWindowMessage",
    fn: postWindowMessage,
  },
  {
    name: "copyToClipboard",
    fn: copyToClipboard,
  },
  {
    name: "resetWidget",
    fn: resetWidget,
  },
  {
    name: "operateWidget",
    fn: operateWidget,
  },
  {
    name: "operateWidgetSync",
    fn: operateWidgetSync,
  },
  {
    name: "storeValue",
    fn: storeValue,
  },
  {
    name: "removeValue",
    fn: removeValue,
  },
  {
    name: "clearStore",
    fn: clearStore,
  },
  {
    name: "windowMessageListener",
    fn: listenMessage,
  },
  {
    name: "unlistenWindowMessage",
    fn: unlistenMessage,
  },
];

const entityFns = [
  {
    name: "run",
    qualifier: (entity: DataTreeEntity) => isRunNClearFnQualifierEntity(entity),
    fn: (entity: DataTreeEntity, entityName: string) => {
      const actionEntity = entity as ActionEntity;
      // @ts-expect-error: name is not defined on ActionEntity
      actionEntity.name = entityName;
      return getFnWithGuards(
        run.bind(actionEntity as ActionEntity),
        `${entityName}.run`,
        [isAsyncGuard],
      );
    },
  },
  {
    name: "clear",
    qualifier: (entity: DataTreeEntity) => isRunNClearFnQualifierEntity(entity),
    fn: (entity: DataTreeEntity, entityName: string) =>
      getFnWithGuards(
        clear.bind(entity as ActionEntity),
        `${entityName}.clear`,
        [isAsyncGuard],
      ),
  },
  {
    name: "getGeoLocation",
    path: "appsmith.geolocation.getCurrentPosition",
    qualifier: (entity: DataTreeEntity) => isAppsmithEntity(entity),
    fn: () =>
      getFnWithGuards(
        getGeoLocation,
        "appsmith.geolocation.getCurrentPosition",
        [isAsyncGuard],
      ),
  },
  {
    name: "watchGeoLocation",
    path: "appsmith.geolocation.watchPosition",
    qualifier: (entity: DataTreeEntity) => isAppsmithEntity(entity),
    fn: () =>
      getFnWithGuards(watchGeoLocation, "appsmith.geolocation.watchPosition", [
        isAsyncGuard,
      ]),
  },
  {
    name: "stopWatchGeoLocation",
    path: "appsmith.geolocation.clearWatch",
    qualifier: (entity: DataTreeEntity) => isAppsmithEntity(entity),
    fn: () =>
      getFnWithGuards(stopWatchGeoLocation, "appsmith.geolocation.clearWatch", [
        isAsyncGuard,
      ]),
  },
];

export type ActionTriggerKeys =
  | TClearActionType
  | TRunActionType
  | TDownloadActionType
  | TShowModalActionType
  | TCloseModalActionType
  | TSetToolbarActionType
  | TSetBrowserActionType
  | TShowAlertActionType
  | TDownloadActionType
  | TNavigateToActionType
  | TGetWidgetsActionType
  | TResetWidgetActionType
  | TOperateWidgetActionType
  | TOperateWidgetSyncActionType
  | TCopyToClipboardActionType
  | TPostWindowMessageActionType
  | TGetGeoLocationActionType
  | TWatchGeoLocationActionType
  | TStopWatchGeoLocationActionType
  | TSetLoadingActionType
  // 修改处
  | TShowProgressBarActionType
  | TShowQueryActionType
  | TCloseQueryActionType
  | TShowCommonDialogActionType
  | TShowMessageActionType
  | TShowMaterialsActionType
  | TShowPrintActionType
  | TClosePrintActionType
  | TListenMessageActionType
  | TUnlistenMessageActionType;

export const getActionTriggerFunctionNames = (): Record<string, string> => {
  return ActionTriggerFunctionNames;
};

const ActionTriggerFunctionNames: Record<string, string> = {
  CLEAR_INTERVAL: "clearInterval",
  CLEAR_PLUGIN_ACTION: "action.clear",
  CLOSE_MODAL: "closeModal",
  COPY_TO_CLIPBOARD: "copyToClipboard",
  DOWNLOAD: "download",
  NAVIGATE_TO: "navigateTo",
  GET_WIDGETS: "getWidgets",
  RESET_WIDGET_META_RECURSIVE_BY_NAME: "resetWidget",
  OPERATE_WIDGET_BY_NAME: "operateWidget",
  OPERATE_WIDGET_BY_NAME_SYNC: "operateWidgetSync",
  RUN_PLUGIN_ACTION: "action.run",
  SET_INTERVAL: "setInterval",
  SET_TOOLBAR: "set_toolbar",
  GET_TOOLBAR: "get_toolbar",
  SET_BROWSER: "set_browser",
  SHOW_ALERT: "showAlert",
  SHOW_MODAL_BY_NAME: "showModal",
  STORE_VALUE: "storeValue",
  REMOVE_VALUE: "removeValue",
  CLEAR_STORE: "clearStore",
  GET_CURRENT_LOCATION: "getCurrentLocation",
  WATCH_CURRENT_LOCATION: "watchLocation",
  STOP_WATCHING_CURRENT_LOCATION: "stopWatch",
  POST_MESSAGE: "postWindowMessage",
  SET_TIMEOUT: "setTimeout",
  CLEAR_TIMEOUT: "clearTimeout",
  SET_LOADING: "setLoading",
  // 修改处
  SHOW_PROGRESS_BAR: "showProgressBar",
  SHOW_QUERY: "showQuery",
  CLOSE_QUERY: "closeQuery",
  SHOW_COMMON_DIALOG: "showCommonDialog",
  SHOW_MESSAGE: "showMessage",
  SHOW_MATERIALS: "showMaterials",
  SHOW_PRINT: "showPrint",
  CLOSE_PRINT: "closePrint",

  WINDOW_MESSAGE_LISTENER: "windowMessageListener",
  UNLISTEN_WINDOW_MESSAGE: "unlistenWindowMessage",
};

export type ActionDescription =
  | TRunDescription
  | TClearDescription
  | TShowModalDescription
  | TCloseModalDescription
  | TClearDescription
  | TStoreValueDescription
  | TClearStoreDescription
  | TRemoveValueDescription
  | TDownloadDescription
  | TPostWindowMessageDescription
  | TNavigateToDescription
  | TGetWidgetsDescription
  | TSetToolbarDescription
  | TGetToolbarDescription
  | TSetBrowserDescription
  | TShowAlertDescription
  | TResetWidgetDescription
  | TCopyToClipboardDescription
  | TGetGeoLocationDescription
  | TWatchGeoLocationDescription
  | TStopWatchGeoLocationDescription
  // 修改处
  | TOperateWidgetDescription
  | TOperateWidgetSyncDescription
  | TSetLoadingDescription
  | TShowProgressBarDescription
  | TShowQueryDescription
  | TCloseQueryDescription
  | TShowCommonDialogDescription
  | TShowMessageDescription
  | TShowMaterialsDescription
  | TShowPrintDescription
  | TClosePrintDescription
  | TListenMessageDescription
  | TUnlistenMessageDescription;
