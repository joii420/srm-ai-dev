import { put } from "redux-saga/effects";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { commonDialogType } from "workers/Evaluation/fns/showCommonDialog";

export const showCommonDialogSaga = function* (params: {
  params: any;
  type: commonDialogType;
}) {
  yield put({
    type: ReduxActionTypes.SHOW_COMMON_DIALOG,
    payload: params,
  });
};
