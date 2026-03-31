import { call, select, put } from "redux-saga/effects";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";

export const setLoadingSaga = function* (params: unknown) {
  yield put({
    type: ReduxActionTypes.SET_LOADING,
    payload: params,
  });
};
