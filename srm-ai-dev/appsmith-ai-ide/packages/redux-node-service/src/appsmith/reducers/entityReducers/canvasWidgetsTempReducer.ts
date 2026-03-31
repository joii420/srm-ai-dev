import { createImmerReducer } from "utils/ReducerUtils";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import type { CanvasWidgetsReduxState } from "./canvasWidgetsReducer";

export const initialState: CanvasWidgetsReduxState = {};

const canvasWidgetsTempReducer = createImmerReducer(initialState, {
  [ReduxActionTypes.STORE_CANVAS_LAYOUT_TEMP]: (
    state: CanvasWidgetsReduxState,
    action: ReduxAction<any>,
  ) => {
    return action.payload;
  },
});

export default canvasWidgetsTempReducer;
