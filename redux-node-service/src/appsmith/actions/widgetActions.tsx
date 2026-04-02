import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import {
  ReduxActionTypes,
  WidgetReduxActionTypes,
} from "@appsmith/constants/ReduxActionConstants";
import type { ExecuteTriggerPayload } from "constants/AppsmithActionConstants/ActionConstants";
import type { BatchAction } from "actions/batchActions";
import { batchAction } from "actions/batchActions";
import type { WidgetProps } from "widgets/BaseWidget";
import type { PartialExportParams } from "sagas/PartialImportExportSagas";
import type { PasteWidgetReduxAction } from "constants/WidgetConstants";
import { viewSocket } from "pages/AppViewer/AppViewSocket/AppViewSocket";

export const widgetInitialisationSuccess = () => {
  return {
    type: ReduxActionTypes.WIDGET_INIT_SUCCESS,
  };
};

export const executeTrigger = (
  evalMode: boolean,
  ps: string,
  payload: ExecuteTriggerPayload,
) => {
  // const evalMode = store.getState().ui.onBoarding.evalMode;
  if (evalMode && payload.source !== "storeValue") {
    const params = {
      messageId: uuid4(), //请求消息编码 一般有返回值的时候会用到
      body: {
        methodName: payload.triggerPropertyName, //如果不在方法树中就直接执行
        methodString: payload.dynamicString, //如果不在方法树中就直接执行
        type: payload.event.type, //目前没用
      },
      type: "JS_EXECUTION",
    };
    // socket发送sript请求
    viewSocket.sendScript(evalMode, ps, params);
    return batchAction({
      type: ReduxActionTypes.EXECUTE_TRIGGER_NOWORK,
      payload,
    });
  } else {
    return batchAction({
      type: ReduxActionTypes.EXECUTE_TRIGGER_REQUEST,
      payload,
    });
  }
};

export const executeTriggerSync = (payload: any): any => ({
  type: ReduxActionTypes.EXECUTE_TRIGGER_REQUEST_SYNC,
  payload,
});

export const disableDragAction = (
  isDraggingDisabled: boolean,
): ReduxAction<{ isDraggingDisabled: boolean }> => {
  return {
    type: ReduxActionTypes.DISABLE_WIDGET_DRAG,
    payload: {
      isDraggingDisabled,
    },
  };
};

export const createModalAction = (
  modalName: string,
): ReduxAction<{ modalName: string }> => {
  return {
    type: ReduxActionTypes.CREATE_MODAL_INIT,
    payload: {
      modalName,
    },
  };
};

export const focusWidget = (
  widgetId?: string,
  alt?: boolean,
): ReduxAction<{ widgetId?: string; alt?: boolean }> => ({
  type: ReduxActionTypes.FOCUS_WIDGET,
  payload: { widgetId, alt },
});

export const altFocusWidget = (alt: boolean) => ({
  type: ReduxActionTypes.ALT_FOCUS_WIDGET,
  payload: alt,
});

export const showModal = (id: string, shouldSelectModal = true) => {
  return {
    type: ReduxActionTypes.SHOW_MODAL,
    payload: {
      modalId: id,
      shouldSelectModal,
    },
  };
};

export const showDrawer = (id: string, shouldSelect = true) => {
  return {
    type: ReduxActionTypes.SHOW_DRAWER,
    payload: {
      widgetId: id,
      shouldSelect,
    },
  };
};

export const closePropertyPane = () => {
  return {
    type: ReduxActionTypes.HIDE_PROPERTY_PANE,
    payload: {
      force: false,
    },
  };
};

export const closeTableFilterPane = () => {
  return {
    type: ReduxActionTypes.HIDE_TABLE_FILTER_PANE,
    payload: {
      force: false,
    },
  };
};

export const copyWidget = (isShortcut: boolean) => {
  return {
    type: ReduxActionTypes.COPY_SELECTED_WIDGET_INIT,
    payload: {
      isShortcut: !!isShortcut,
    },
  };
};

export const pasteWidget = ({
  gridPosition,
  groupWidgets = false,
  mouseLocation,
}: PasteWidgetReduxAction) => {
  return {
    type: ReduxActionTypes.PASTE_COPIED_WIDGET_INIT,
    payload: {
      groupWidgets,
      mouseLocation,
      gridPosition,
    },
  };
};

export const deleteSelectedWidget = (
  isShortcut: boolean,
  disallowUndo = false,
) => {
  return {
    type: WidgetReduxActionTypes.WIDGET_DELETE,
    payload: {
      isShortcut,
      disallowUndo,
    },
  };
};

export const cutWidget = () => {
  return {
    type: ReduxActionTypes.CUT_SELECTED_WIDGET,
  };
};

export const addSuggestedWidget = (payload: Partial<WidgetProps>) => {
  return {
    type: ReduxActionTypes.ADD_SUGGESTED_WIDGET,
    payload,
  };
};

/**
 * action to group selected widgets into container
 * @returns
 */
export const groupWidgets = () => {
  return {
    type: ReduxActionTypes.GROUP_WIDGETS_INIT,
  };
};

export const openPartialExportModal = (payload: boolean) => {
  return {
    type: ReduxActionTypes.PARTIAL_EXPORT_MODAL_OPEN,
    payload,
  };
};

export const partialExportWidgets = (params: PartialExportParams) => {
  return {
    type: ReduxActionTypes.PARTIAL_EXPORT_INIT,
    payload: params,
  };
};

export const setWidgetSelectionBlock = (payload: boolean) => {
  return {
    type: ReduxActionTypes.SET_WIDGET_SELECTION_BLOCK,
    payload,
  };
};
