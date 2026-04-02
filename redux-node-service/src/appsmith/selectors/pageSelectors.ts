import type { AppState } from "@appsmith/reducers";
import type { PageItem } from "@appsmith/reducers/pagesReducer";
import { getPathParams } from "ce/utils/tool";
import { createSelector } from "reselect";

// rootStore
export const getPageList = (state: AppState) => state.pages.pageList;
export const getActivePageKey = (state: AppState) => state.pages.activePageKey;
export const getActivePagePs = createSelector(
  getPageList,
  getActivePageKey,
  (pageList: PageItem[], activePageKey: string | null) => {
    if (!activePageKey) return null;
    const page = pageList.find(page => page.pageKey === activePageKey);
    return page?.ps;
  },
);
export const getPageStores = (state: AppState) => state.pages.pageStores;

// rootStore & pageStore
export const getPageInfo = (state: AppState) => state.pageInfo || {};
export const getPagePs = (state: AppState) => {
  const pageInfo = getPageInfo(state);
  return pageInfo.ps || getPathParams().ps;
};
export const getPageKey = (state: AppState) => {
  const pageInfo = getPageInfo(state);
  return pageInfo.pageKey;
};
