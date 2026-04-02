export * from "ce/reducers/uiReducers";
import { uiReducerObject as CE_uiReducerObject } from "ce/reducers/uiReducers";
import { combineReducers } from "redux";
import packagesReducer from "@appsmith/reducers/uiReducers/packagesReducer";
import moduleReducer from "@appsmith/reducers/uiReducers/moduleReducer";
import moduleInstancePane from "./moduleInstancePaneReducer";

const uiReducer = combineReducers({
  ...CE_uiReducerObject,
  packages: packagesReducer,
  module: moduleReducer,
  moduleInstancePane,
});

export default uiReducer;
