export * from "ce/reducers";
import { reducerObject as CE_AppReducer } from "ce/reducers";
import { combineReducers } from "redux";
import PagesReducer from '@appsmith/reducers/pagesReducer';
import createPageInfoReducer from "./pageInfoReducer";

const appReducer = combineReducers({ ...CE_AppReducer });

export const viewRootReducer = combineReducers({
  ...CE_AppReducer,
  pages: PagesReducer,
  pageInfo: createPageInfoReducer({} as any),
});

export default appReducer;
