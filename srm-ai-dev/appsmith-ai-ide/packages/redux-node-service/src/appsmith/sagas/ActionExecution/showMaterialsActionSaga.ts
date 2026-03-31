import { call, select, put } from "redux-saga/effects";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";

export const showMaterialsSaga = function* (params: unknown) {
  yield put({
    type: ReduxActionTypes.SHOW_MATERIALS,
    payload: {
      params,
    },
  });
};
