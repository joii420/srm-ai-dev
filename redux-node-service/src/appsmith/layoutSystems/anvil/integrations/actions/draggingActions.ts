import type { AnvilHighlightInfo, DraggedWidget } from "layoutSystems/anvil/utils/anvilTypes";
import type { AnvilMoveWidgetsPayload, AnvilNewWidgetsPayload } from "./actionTypes";
import { AnvilReduxActionTypes } from "./actionTypes";

export const setHighlightsDrawnAction = (highlight?: AnvilHighlightInfo) => {
  return {
    type: AnvilReduxActionTypes.ANVIL_SET_HIGHLIGHT_SHOWN,
    payload: { highlight },
  };
};

export const addNewAnvilWidgetAction = (
  newWidget: {
    width: number;
    height: number;
    newWidgetId: string;
    type: string;
    detachFromLayout: boolean;
  },
  highlight: AnvilHighlightInfo,
  dragMeta: any,
) => {
  const payload: AnvilNewWidgetsPayload = { highlight, newWidget, dragMeta };
  return {
    type: AnvilReduxActionTypes.ANVIL_ADD_NEW_WIDGET,
    payload,
  };
};

export const moveAnvilWidgets = (
  highlight: AnvilHighlightInfo,
  movedWidgets: DraggedWidget[],
  dragMeta: any,
) => {
  const payload: AnvilMoveWidgetsPayload = { highlight, movedWidgets, dragMeta };
  return {
    type: AnvilReduxActionTypes.ANVIL_MOVE_WIDGET,
    payload,
  };
};

export const addSuggestedWidgetAnvilAction = (newWidget: {
  newWidgetId: string;
  type?: string;
  rows?: number;
  columns?: number;
  props?: any;
}) => {
  return {
    type: AnvilReduxActionTypes.ANVIL_ADD_SUGGESTED_WIDGET,
    payload: { newWidget },
  };
};
