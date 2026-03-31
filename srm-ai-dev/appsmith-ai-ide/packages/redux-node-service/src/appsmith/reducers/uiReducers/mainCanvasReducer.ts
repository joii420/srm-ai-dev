import { createImmerReducer } from "utils/ReducerUtils";
import type {
  ReduxAction,
  UpdateCanvasPayload,
} from "@appsmith/constants/ReduxActionConstants";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import {
  layoutConfigurations,
  MAIN_CONTAINER_WIDGET_ID,
} from "constants/WidgetConstants";
import type { UpdateCanvasLayoutPayload } from "actions/controlActions";

const initialState: MainCanvasReduxState = {
  initialized: false,
  width: 0,
  height: 0,
  isMobile: false,
  workspaceHeight: 0, // 工作区整体高度 
};

const mainCanvasReducer = createImmerReducer(initialState, {
  [ReduxActionTypes.INIT_CANVAS_LAYOUT]: (
    state: MainCanvasReduxState,
    action: ReduxAction<UpdateCanvasPayload>,
  ) => {
    const mainCanvas =
      action.payload.widgets &&
      action.payload.widgets[MAIN_CONTAINER_WIDGET_ID];

    state.width = mainCanvas?.rightColumn || state.width;
    state.height = mainCanvas?.minHeight || state.height;
  },
  [ReduxActionTypes.UPDATE_CANVAS_LAYOUT]: (
    state: MainCanvasReduxState,
    action: ReduxAction<UpdateCanvasLayoutPayload>,
  ) => {
    state.workspaceHeight = action.payload.workspaceHeight || state.workspaceHeight;
    state.width = action.payload.width || state.width;
    state.initialized = true;
    state.isMobile =
      action.payload.width <= layoutConfigurations.MOBILE.maxWidth;
  },
});

export interface MainCanvasReduxState {
  initialized: boolean;
  width: number;
  height: number;
  isMobile: boolean;
  workspaceHeight: number;
}

export default mainCanvasReducer;
