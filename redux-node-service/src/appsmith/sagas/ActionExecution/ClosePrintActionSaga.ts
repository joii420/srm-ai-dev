import { call, select, put } from "redux-saga/effects";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";

export const closePrintSaga = function* (params: unknown) {
  yield put({
    type: ReduxActionTypes.CLOSE_PRINT,
    payload: undefined,
  });
};
