import { createReducer } from "utils/ReducerUtils";
import { type PageItem } from "./pagesReducer";
import { ReduxActionTypes } from "ce/constants/ReduxActionConstants";

// 页面信息reducer
function createPageInfoReducer(initialState: PageItem) {
  return createReducer(initialState, {
    [ReduxActionTypes.INIT_HOME_VIEW_PAGE]: (state, action) => {
      const pageInfo = { ...action.payload, closeAble: false, isRootPage: true };
      return { ...state, ...pageInfo }
    },
  });
}

export default createPageInfoReducer;
