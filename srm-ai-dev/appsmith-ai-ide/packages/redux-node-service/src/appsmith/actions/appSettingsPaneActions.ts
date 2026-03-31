import { getExportPageAPIRoute } from "@appsmith/constants/ApiConstants";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import type {
  AppSettingsPaneReduxState,
  ExportPagePaneContext,
} from "reducers/uiReducers/appSettingsPaneReducer";

//Joii 导出
export const exportPageAction = (context?: ExportPagePaneContext) => {
  const pageId = context?.pageId as string;
  const applicationId = context?.applicationId as string;
  return window.open(getExportPageAPIRoute(pageId, applicationId), "_blank");
};

export const updateAppSettingsPaneSelectedTabAction = (
  payload: AppSettingsPaneReduxState,
) => {
  return {
    type: ReduxActionTypes.UPDATE_APP_SETTINGS_PANE_SELECTED_TAB,
    payload: payload,
  };
};
