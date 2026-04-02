import { call, select, put } from "redux-saga/effects";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";

export const showQuerySaga = function* (params: unknown) {
  yield put({
    type: ReduxActionTypes.SHOW_QUERY,
    payload: {
      params,
    },
  });
};
