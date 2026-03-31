import { call, select, put } from "redux-saga/effects";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";

export const showProgressBarSaga = function* (params: unknown) {
  yield put({
    type: ReduxActionTypes.SHOW_PROGRESS_BAR,
    payload: params,
  });
};
