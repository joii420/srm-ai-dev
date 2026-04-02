import { call, select, put } from "redux-saga/effects";
import type {
  TSetToolbarDescription,
  TSetBrowserDescription,
} from "workers/Evaluation/fns/globalLayoutFns";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { getToolbarConfig } from "selectors/onboardingSelectors";
import operateWidgetActionSaga from "./OperateWidgetActionSaga";
import type { TOperateWidgetDescription } from "workers/Evaluation/fns/operateWidget";
import { GLOBAL_FUNC_WIDGET_NAME } from "utils/hooks/useFuncWidget";

const setToolbarSaga = function* (action: TSetToolbarDescription) {
  const { payload } = action;
  // save to store
  yield put({
    type: ReduxActionTypes.UPDATE_TOOLBAR_CONFIG,
    payload,
  });
};
const getToolbarSaga = function* getWidgetsActionSaga() {
  const toolbarConfig = yield select(getToolbarConfig);
  return toolbarConfig;
};

const setBrowserSaga = function* (action: TSetBrowserDescription) {
  const { payload } = action;
  // save to store

  if (payload?.actionName) {
    if (payload.actionName === "delete") {
      const data: TOperateWidgetDescription = {
        type: "OPERATE_WIDGET_BY_NAME",
        payload: {
          widgetName: GLOBAL_FUNC_WIDGET_NAME.DocListGrid,
          method: "deleteRecord",
          params: [payload.data],
        },
      };
      yield call(operateWidgetActionSaga, data);
    }
    yield put({
      type: ReduxActionTypes.EXECUTE_ACTION_TO_DOC_LIST,
      payload,
    });
  } else {
    yield put({
      type: ReduxActionTypes.PUT_STATE_FROM_APP_TO_DOC_LIST,
      payload,
    });
  }
  yield put({
    type: ReduxActionTypes.UPDATE_LEFTSIDEBAR_CONFIG,
    payload,
  });
};

export { setToolbarSaga, setBrowserSaga, getToolbarSaga };
