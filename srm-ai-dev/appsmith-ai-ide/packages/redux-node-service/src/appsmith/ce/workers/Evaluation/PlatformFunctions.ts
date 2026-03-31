/* eslint-disable @typescript-eslint/ban-types */
import type { ActionDescription } from "@appsmith/entities/DataTree/actionTriggers";
import { ExecutionType } from "@appsmith/workers/Evaluation/Actions";
import _ from "lodash";
import uniqueId from "lodash/uniqueId";
import type { NavigationTargetType_Dep } from "sagas/ActionExecution/NavigateActionSaga";
import type { commonDialogType } from "workers/Evaluation/fns/showCommonDialog";

export type ActionDescriptionWithExecutionType = ActionDescription & {
  executionType: ExecutionType;
};

export type ActionDispatcherWithExecutionType = (
  ...args: any[]
) => ActionDescriptionWithExecutionType;

export const PLATFORM_FUNCTIONS: Record<
  string,
  ActionDispatcherWithExecutionType
> = {
  navigateTo: function (
    pageNameOrUrl: string,
    params: Record<string, string>,
    target?: NavigationTargetType_Dep,
  ) {
    return {
      type: "NAVIGATE_TO",
      payload: { pageNameOrUrl, params, target },
      executionType: ExecutionType.PROMISE,
    };
  },
  getWidgets: function () {
    return {
      type: "GET_WIDGETS",
      payload: null,
      executionType: ExecutionType.PROMISE,
    };
  },
  set_toolbar: function (config: any) {
    return {
      type: "SET_TOOLBAR",
      payload: config,
      executionType: ExecutionType.PROMISE,
    };
  },
  get_toolbar: function () {
    return {
      type: "GET_TOOLBAR",
      payload: null,
      executionType: ExecutionType.PROMISE,
    };
  },
  set_browser: function (config: any) {
    return {
      type: "SET_BROWSER",
      payload: config,
      executionType: ExecutionType.PROMISE,
    };
  },
  setLoading: function (params: unknown) {
    return {
      type: "SET_LOADING",
      payload: {
        params,
      },
      executionType: ExecutionType.PROMISE,
    };
  },
  // 修改处
  showProgressBar: function (params: unknown) {
    return {
      type: "SHOW_PROGRESS_BAR",
      payload: {
        params,
      },
      executionType: ExecutionType.PROMISE,
    };
  },
  showQuery: function (params: unknown) {
    return {
      type: "SHOW_QUERY",
      payload: {
        params,
      },
      executionType: ExecutionType.PROMISE,
    };
  },
  closeQuery: function (params: unknown) {
    return {
      type: "CLOSE_QUERY",
      payload: {
        params,
      },
      executionType: ExecutionType.PROMISE,
    };
  },
  showCommonDialog: function (params: any, type: commonDialogType) {
    return {
      type: "SHOW_COMMON_DIALOG",
      payload: { params, type },
      executionType: ExecutionType.PROMISE,
    };
  },
  showMessage: function (params: unknown, type: string, type2: string) {
    return {
      type: "SHOW_MESSAGE",
      payload: {
        params,
        type,
        type2,
      },
      executionType: ExecutionType.PROMISE,
    };
  },
  showMaterials: function (params: unknown, type: string) {
    return {
      type: "SHOW_MATERIALS",
      payload: {
        params,
        type,
      },
      executionType: ExecutionType.PROMISE,
    };
  },
  showPrint: function (params: unknown) {
    return {
      type: "SHOW_PRINT",
      payload: {
        params,
      },
      executionType: ExecutionType.PROMISE,
    };
  },
  closePrint: function (params: unknown) {
    return {
      type: "CLOSE_PRINT",
      payload: {
        params,
      },
      executionType: ExecutionType.PROMISE,
    };
  },

  showAlert: function (
    message: string,
    style: "info" | "success" | "warning" | "error" | "default",
  ) {
    return {
      type: "SHOW_ALERT",
      payload: { message, style },
      executionType: ExecutionType.PROMISE,
    };
  },
  showModal: function (modalName: string) {
    return {
      type: "SHOW_MODAL_BY_NAME",
      payload: { modalName },
      executionType: ExecutionType.PROMISE,
    };
  },
  closeModal: function (modalName: string) {
    return {
      type: "CLOSE_MODAL",
      payload: { modalName },
      executionType: ExecutionType.PROMISE,
    };
  },
  storeValue: function (key: string, value: string, persist = true) {
    // momentarily store this value in local state to support loops
    _.set(self, ["appsmith", "store", key], value);
    return {
      type: "STORE_VALUE",
      payload: {
        key,
        value,
        persist,
        uniqueActionRequestId: uniqueId("store_value_id_"),
      },
      executionType: ExecutionType.PROMISE,
    };
  },
  removeValue: function (key: string) {
    return {
      type: "REMOVE_VALUE",
      payload: { key },
      executionType: ExecutionType.PROMISE,
    };
  },
  clearStore: function () {
    return {
      type: "CLEAR_STORE",
      executionType: ExecutionType.PROMISE,
      payload: null,
    };
  },
  download: function (data: string, name: string, type: string) {
    return {
      type: "DOWNLOAD",
      payload: { data, name, type },
      executionType: ExecutionType.PROMISE,
    };
  },
  copyToClipboard: function (
    data: string,
    options?: { debug?: boolean; format?: string },
  ) {
    return {
      type: "COPY_TO_CLIPBOARD",
      payload: {
        data,
        options: { debug: options?.debug, format: options?.format },
      },
      executionType: ExecutionType.PROMISE,
    };
  },
  resetWidget: function (widgetName: string, resetChildren = true) {
    return {
      type: "RESET_WIDGET_META_RECURSIVE_BY_NAME",
      payload: { widgetName, resetChildren },
      executionType: ExecutionType.PROMISE,
    };
  },
  operateWidget: function (
    widgetName: string,
    method: string,
    params: unknown,
  ) {
    return {
      type: "OPERATE_WIDGET_BY_NAME",
      payload: { widgetName, method, params },
      executionType: ExecutionType.PROMISE,
    };
  },
  operateWidgetSync: function (
    widgetName: string,
    method: string,
    params: unknown,
  ) {
    return {
      type: "OPERATE_WIDGET_BY_NAME_SYNC",
      payload: { widgetName, method, params },
      executionType: ExecutionType.TRIGGER,
    };
  },
  setInterval: function (callback: Function, interval: number, id?: string) {
    return {
      type: "SET_INTERVAL",
      payload: {
        callback: callback?.toString(),
        interval,
        id,
      },
      executionType: ExecutionType.TRIGGER,
    };
  },
  clearInterval: function (id: string) {
    return {
      type: "CLEAR_INTERVAL",
      payload: {
        id,
      },
      executionType: ExecutionType.TRIGGER,
    };
  },
  postWindowMessage: function (
    message: unknown,
    source: string,
    targetOrigin: string,
  ) {
    return {
      type: "POST_MESSAGE",
      payload: {
        message,
        source,
        targetOrigin,
      },
      executionType: ExecutionType.TRIGGER,
    };
  },
  // 修改处
  windowMessageListener: function (domain: string, callback: Function) {
    return {
      type: "WINDOW_MESSAGE_LISTENER",
      payload: {
        callback: callback?.toString(),
        domain,
      },
      executionType: ExecutionType.TRIGGER,
    };
  },
  unlistenWindowMessage: function (domain: string) {
    return {
      type: "UNLISTEN_WINDOW_MESSAGE",
      payload: {
        domain,
      },
      executionType: ExecutionType.TRIGGER,
    };
  },
};
