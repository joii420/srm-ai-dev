import type { NavigationTargetType_Dep } from "sagas/ActionExecution/NavigateActionSaga";
import type { TypeOptions } from "react-toastify";

export type ActionTriggerKeys =
  | "RUN_PLUGIN_ACTION"
  | "CLEAR_PLUGIN_ACTION"
  | "NAVIGATE_TO"
  | "GET_WIDGETS"
  | "SET_TOOLBAR"
  | "GET_TOOLBAR"
  | "SET_BROWSER"
  | "SET_LOADING"
  // 修改处
  | "SHOW_PROGRESS_BAR"
  | "SHOW_QUERY"
  | "CLOSE_QUERY"
  | "SHOW_COMMON_DIALOG"
  | "SHOW_MATERIALS"
  | "SHOW_MESSAGE"
  | "SHOW_PRINT"
  | "CLOSE_PRINT"
  | "SHOW_ALERT"
  | "SHOW_MODAL_BY_NAME"
  | "CLOSE_MODAL"
  | "STORE_VALUE"
  | "REMOVE_VALUE"
  | "CLEAR_STORE"
  | "DOWNLOAD"
  | "COPY_TO_CLIPBOARD"
  | "RESET_WIDGET_META_RECURSIVE_BY_NAME"
  | "OPERATE_WIDGET_BY_NAME"
  | "OPERATE_WIDGET_BY_NAME_SYNC"
  | "SET_INTERVAL"
  | "CLEAR_INTERVAL"
  | "GET_CURRENT_LOCATION"
  | "WATCH_CURRENT_LOCATION"
  | "STOP_WATCHING_CURRENT_LOCATION"
  | "CONFIRMATION_MODAL"
  | "POST_MESSAGE"
  | "SET_TIMEOUT"
  | "CLEAR_TIMEOUT"
  | "WINDOW_MESSAGE_LISTENER"
  | "UNLISTEN_WINDOW_MESSAGE";

export const ActionTriggerFunctionNames: Record<ActionTriggerKeys, string> = {
  CLEAR_INTERVAL: "clearInterval",
  CLEAR_PLUGIN_ACTION: "action.clear",
  CLOSE_MODAL: "closeModal",
  COPY_TO_CLIPBOARD: "copyToClipboard",
  DOWNLOAD: "download",
  NAVIGATE_TO: "navigateTo",
  GET_WIDGETS: "getWidgets",
  SET_TOOLBAR: "set_toolbar",
  GET_TOOLBAR: "get_toolbar",
  SET_BROWSER: "set_browser",
  RESET_WIDGET_META_RECURSIVE_BY_NAME: "resetWidget",
  OPERATE_WIDGET_BY_NAME: "operateWidget",
  OPERATE_WIDGET_BY_NAME_SYNC: "operateWidgetSync",
  RUN_PLUGIN_ACTION: "action.run",
  SET_INTERVAL: "setInterval",
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

  SHOW_ALERT: "showAlert",
  SHOW_MODAL_BY_NAME: "showModal",
  STORE_VALUE: "storeValue",
  REMOVE_VALUE: "removeValue",
  CLEAR_STORE: "clearStore",
  GET_CURRENT_LOCATION: "getCurrentLocation",
  WATCH_CURRENT_LOCATION: "watchLocation",
  STOP_WATCHING_CURRENT_LOCATION: "stopWatch",
  CONFIRMATION_MODAL: "ConfirmationModal",
  POST_MESSAGE: "postWindowMessage",
  SET_TIMEOUT: "setTimeout",
  CLEAR_TIMEOUT: "clearTimeout",
  WINDOW_MESSAGE_LISTENER: "windowMessageListener",
  UNLISTEN_WINDOW_MESSAGE: "unlistenWindowMessage",
};

export interface ActionDescriptionInterface<T, Type extends ActionTriggerKeys> {
  type: Type;
  payload: T;
}

export type RunPluginActionDescription = ActionDescriptionInterface<
  {
    actionId: string;
    params?: Record<string, unknown>;
    onSuccess?: string;
    onError?: string;
  },
  "RUN_PLUGIN_ACTION"
>;

export type ClearPluginActionDescription = ActionDescriptionInterface<
  {
    actionId: string;
  },
  "CLEAR_PLUGIN_ACTION"
>;

export type NavigateActionDescription = ActionDescriptionInterface<
  {
    pageNameOrUrl: string;
    params?: Record<string, string>;
    target?: NavigationTargetType_Dep;
  },
  "NAVIGATE_TO"
>;

export type GetWidgetsActionDescription = ActionDescriptionInterface<
  null,
  "GET_WIDGETS"
>;

export type SetToolbarActionDescription = ActionDescriptionInterface<
  {
    config: any;
  },
  "SET_TOOLBAR"
>;
export type GetToolbarActionDescription = ActionDescriptionInterface<
  {
    config: any;
  },
  "GET_TOOLBAR"
>;

export type SetBrowserActionDescription = ActionDescriptionInterface<
  {
    config: any;
  },
  "SET_BROWSER"
>;
export type SetLoadingActionDescription = ActionDescriptionInterface<
  {
    params: unknown;
  },
  "SET_LOADING"
>;
// 修改处
export type ShowProgressBarActionDescription = ActionDescriptionInterface<
  {
    params: unknown;
  },
  "SHOW_PROGRESS_BAR"
>;
export type ShowQueryActionDescription = ActionDescriptionInterface<
  {
    params: unknown;
  },
  "SHOW_QUERY"
>;
export type CloseQueryActionDescription = ActionDescriptionInterface<
  {
    params: unknown;
  },
  "CLOSE_QUERY"
>;
export type ShowCommonDialogActionDescription = ActionDescriptionInterface<
  {
    params: unknown;
  },
  "SHOW_COMMON_DIALOG"
>;
export type ShowMessageActionDescription = ActionDescriptionInterface<
  {
    params: unknown;
  },
  "SHOW_MESSAGE"
>;
export type ShowMaterialsActionDescription = ActionDescriptionInterface<
  {
    params: unknown;
  },
  "SHOW_MATERIALS"
>;
export type ShowPrintActionDescription = ActionDescriptionInterface<
  {
    params: unknown;
  },
  "SHOW_PRINT"
>;
export type ClosePrintActionDescription = ActionDescriptionInterface<
  {
    params: unknown;
  },
  "CLOSE_PRINT"
>;
export type ShowAlertActionDescription = ActionDescriptionInterface<
  {
    message: string | unknown;
    style?: TypeOptions;
  },
  "SHOW_ALERT"
>;

export type ShowModalActionDescription = ActionDescriptionInterface<
  {
    modalName: string;
  },
  "SHOW_MODAL_BY_NAME"
>;

export type CloseModalActionDescription = ActionDescriptionInterface<
  {
    modalName: string;
  },
  "CLOSE_MODAL"
>;

export type StoreValueActionDescription = ActionDescriptionInterface<
  {
    key: string;
    value: string;
    persist: boolean;
  },
  "STORE_VALUE"
>;

export type RemoveValueActionDescription = ActionDescriptionInterface<
  {
    key: string;
  },
  "REMOVE_VALUE"
>;

export type ClearStoreActionDescription = ActionDescriptionInterface<
  null,
  "CLEAR_STORE"
>;

export type DownloadActionDescription = ActionDescriptionInterface<
  {
    data: any;
    name: string;
    type: string;
  },
  "DOWNLOAD"
>;

export type CopyToClipboardDescription = ActionDescriptionInterface<
  {
    data: string;
    options: { debug?: boolean; format?: string };
  },
  "COPY_TO_CLIPBOARD"
>;

export type ResetWidgetDescription = ActionDescriptionInterface<
  {
    widgetName: string;
    resetChildren: boolean;
  },
  "RESET_WIDGET_META_RECURSIVE_BY_NAME"
>;

export type OperateWidgetDescription = ActionDescriptionInterface<
  {
    widgetName: string;
    method: string;
    params: unknown;
  },
  "OPERATE_WIDGET_BY_NAME"
>;

export type OperateWidgetSyncDescription = ActionDescriptionInterface<
  {
    widgetName: string;
    method: string;
    params: unknown;
  },
  "OPERATE_WIDGET_BY_NAME_SYNC"
>;

export type SetIntervalDescription = ActionDescriptionInterface<
  {
    callback: string;
    interval: number;
    id?: string;
  },
  "SET_INTERVAL"
>;

export type ClearIntervalDescription = ActionDescriptionInterface<
  {
    id: string;
  },
  "CLEAR_INTERVAL"
>;

interface GeolocationOptions {
  maximumAge?: number;
  timeout?: number;
  enableHighAccuracy?: boolean;
}

interface GeolocationPayload {
  onSuccess?: string;
  onError?: string;
  options?: GeolocationOptions;
}

export type GetCurrentLocationDescription = ActionDescriptionInterface<
  GeolocationPayload,
  "GET_CURRENT_LOCATION"
>;

export type WatchCurrentLocationDescription = ActionDescriptionInterface<
  GeolocationPayload,
  "WATCH_CURRENT_LOCATION"
>;

export type StopWatchingCurrentLocationDescription = ActionDescriptionInterface<
  Record<string, never> | undefined,
  "STOP_WATCHING_CURRENT_LOCATION"
>;

export type ConfirmationModalDescription = ActionDescriptionInterface<
  Record<string, any> | undefined,
  "CONFIRMATION_MODAL"
>;

export type PostMessageDescription = ActionDescriptionInterface<
  {
    message: unknown;
    source: string;
    targetOrigin: string;
  },
  "POST_MESSAGE"
>;
export type WindowMessageListenerDescription = ActionDescriptionInterface<
  {
    domain: string;
    callback: string;
  },
  "WINDOW_MESSAGE_LISTENER"
>;

export type UnlistenWindowMessageDescription = ActionDescriptionInterface<
  {
    domain: string;
  },
  "UNLISTEN_WINDOW_MESSAGE"
>;

export type ActionDescription =
  | RunPluginActionDescription
  | ClearPluginActionDescription
  | NavigateActionDescription
  | GetWidgetsActionDescription
  | SetToolbarActionDescription
  | SetBrowserActionDescription
  // 修改处
  | ShowQueryActionDescription
  | CloseQueryActionDescription
  | ShowCommonDialogActionDescription
  | ShowMessageActionDescription
  | ShowMaterialsActionDescription
  | ShowPrintActionDescription
  | ClosePrintActionDescription
  | ShowAlertActionDescription
  | ShowModalActionDescription
  | CloseModalActionDescription
  | StoreValueActionDescription
  | RemoveValueActionDescription
  | ClearStoreActionDescription
  | DownloadActionDescription
  | CopyToClipboardDescription
  | ResetWidgetDescription
  | OperateWidgetDescription
  | OperateWidgetSyncDescription
  | SetIntervalDescription
  | ClearIntervalDescription
  | GetCurrentLocationDescription
  | WatchCurrentLocationDescription
  | StopWatchingCurrentLocationDescription
  | ConfirmationModalDescription
  | PostMessageDescription
  | WindowMessageListenerDescription
  | UnlistenWindowMessageDescription;
