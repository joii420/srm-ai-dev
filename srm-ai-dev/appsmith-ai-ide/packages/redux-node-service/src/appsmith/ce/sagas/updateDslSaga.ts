import { put, select } from "redux-saga/effects";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import {
  getCurrentLayoutId,
  getCurrentPageId,
} from "selectors/editorSelectors";
import { updateCanvasWithDSL } from "ce/sagas/PageSagas";

export function* updateDslSaga(action: ReduxAction<{ dsl: any }>) {
  const layoutId: string | undefined = yield select(getCurrentLayoutId);
  const pageId: string | undefined = yield select(getCurrentPageId);

  const dsl = JSON.parse(action.payload.dsl);
  const data = {
    actionUpdates: [],
    dsl,
    id: layoutId,
    layoutOnLoadActionErrors: [],
    layoutOnLoadActions: [],
    messages: [],
  };
  // @ts-expect-error: pageId can be undefined
  yield updateCanvasWithDSL(data, pageId, layoutId);
  // Add this to the page DSLs for entity explorer
  yield put({
    type: ReduxActionTypes.FETCH_PAGE_DSL_SUCCESS,
    payload: {
      pageId: pageId,
      dsl,
      layoutId,
    },
  });
}
