import type { APP_MODE } from "entities/App";
import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";

// 初始化子页面需要传递当前的pageId，不走url上获取
export const initCurrentPage = (pageId?: string) => {
  return {
    type: ReduxActionTypes.INITIALIZE_CURRENT_PAGE,
    payload: { pageId },
  };
};

export interface InitializeEditorPayload {
  applicationId?: string;
  pageId?: string;
  branch?: string;
  mode: APP_MODE;
  shouldInitialiseUserDetails?: boolean;
}

export const initEditor = (
  payload: InitializeEditorPayload,
): ReduxAction<InitializeEditorPayload> => ({
  type: ReduxActionTypes.INITIALIZE_EDITOR,
  payload,
});

export interface InitAppViewerPayload {
  branch: string;
  applicationId?: string;
  pageId: string;
  mode: APP_MODE;
  shouldInitialiseUserDetails?: boolean;
}

export const initAppViewer = ({
  applicationId,
  branch,
  mode,
  pageId,
  shouldInitialiseUserDetails,
}: InitAppViewerPayload) => ({
  type: ReduxActionTypes.INITIALIZE_PAGE_VIEWER,
  payload: {
    branch: branch,
    applicationId,
    pageId,
    mode,
    shouldInitialiseUserDetails,
  },
});

export const resetEditorRequest = () => ({
  type: ReduxActionTypes.RESET_EDITOR_REQUEST,
});

export const resetEditorSuccess = () => ({
  type: ReduxActionTypes.RESET_EDITOR_SUCCESS,
});
