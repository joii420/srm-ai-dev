import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { getPageInitJson } from "@appsmith/sagas/MultiPageSaga";
import { type Store } from "redux";
import store, { createViewPageStore } from "store";
import { createReducer } from "utils/ReducerUtils";

export function createPageKey(code: string) {
  return code;
}

export interface PageItem {
  pageKey: string
  title: string
  pageId: string
  code: string
  ps: string
  closeAble: boolean
  isRootPage: boolean
  isDisconnected?: boolean
}

export interface PagesReduxState {
  pageList: PageItem[];
  pageStores: {[key: string]: Store};
  activePageKey: string | null;
}

const initialState: PagesReduxState = {
  pageList: [],
  pageStores: {},
  activePageKey: null,
}

export default createReducer(initialState, {
  [ReduxActionTypes.INIT_HOME_VIEW_PAGE]: (state, action) => {
    const pageInfo = { ...action.payload, closeAble: false, isRootPage: true };
    const pageKey = pageInfo.pageKey;

    const pageList: PageItem[] = [pageInfo];
    const pageStores: any = {
      [pageKey]: store,
    };
    let activePageKey = pageKey;

    const pageJson = getPageInitJson();
    const isLegal = pageJson.pageList?.find?.((page: PageItem) => !!page.isRootPage)?.ps === pageInfo.ps;
    if (isLegal) {
      (pageJson.pageList || []).forEach((page: PageItem) => {
        if (!page.isRootPage) {
          pageList.push(page)
          const pageStore = createViewPageStore({ ...page });
          pageStores[page.pageKey] = pageStore;
        }
      });
      if (pageJson.activePageKey) {
        activePageKey = pageJson.activePageKey;
      }
    }

    const newState = {
      ...state,
      activePageKey: activePageKey,
      pageList: pageList,
      pageStores: pageStores,
    };

    return newState
  },
  [ReduxActionTypes.OPEN_NEW_VIEW_PAGE]: (state, action) => {
    const pageInfo = { ...action.payload, closeAble: true, isRootPage: false };
    const pageKey = pageInfo.pageKey;

    if (state.pageList.find((page: PageItem) => page.pageKey === pageKey)) return state;

    const pageStore = createViewPageStore({ ...pageInfo });
    const newState = {
      ...state,
      activePageKey: pageKey,
      pageList: state.pageList.concat(pageInfo),
      pageStores: {
        ...state.pageStores,
        [pageKey]: pageStore,
      },
    };

    return newState
  },
  [ReduxActionTypes.CLOSE_VIEW_PAGE]: (state, action) => {
    const pageKey = action.payload.pageKey;
    const newState = {
      ...state,
      pageList: state.pageList.filter((page: PageItem) => page.pageKey !== pageKey),
      pageStores: { ...state.pageStores },
    }

    delete newState.pageStores[pageKey];
    // 如果关闭当前页面，则回到首页
    if (newState.activePageKey === pageKey) {
      let currentIndex = state.pageList.findIndex((page: PageItem) => page.pageKey === pageKey);
      if (currentIndex > newState.pageList.length - 1) {
        currentIndex = newState.pageList.length - 1;
      }
      newState.activePageKey = currentIndex >= 0 ?
        newState.pageList[currentIndex].pageKey :
        null;
    }

    return newState;
  },
  [ReduxActionTypes.CLOSE_OTHER_VIEW_PAGE]: (state, action) => {
    const pageKey = action.payload.pageKey;
    const newState = {
      ...state,
      activePageKey: pageKey,
      pageList: state.pageList.filter((page: PageItem) => page.isRootPage || page.pageKey === pageKey),
      pageStores: { ...state.pageStores },
    }
    state.pageList.forEach((page: PageItem) => {
      if (page.isRootPage || page.pageKey === pageKey) return;
      delete newState.pageStores[page.pageKey];
    });
    return newState;
  },
  [ReduxActionTypes.CLOSE_ALL_VIEW_PAGE]: (state, action) => {
    const newState = {
      ...state,
      activePageKey: state.pageList.find((page: PageItem) => page.isRootPage)?.pageKey,
      pageList: state.pageList.filter((page: PageItem) => page.isRootPage),
      pageStores: { ...state.pageStores },
    }
    state.pageList.forEach((page: PageItem) => {
      if (page.isRootPage) return;
      delete newState.pageStores[page.pageKey];
    });
    return newState;
  },
  [ReduxActionTypes.CHANGE_VIEW_PAGE]: (state, action) => {
    const pageKey = action.payload.pageKey;
    if (pageKey === state.activePageKey) return state;
    return { ...state, activePageKey: pageKey };
  },
  [ReduxActionTypes.UPDATE_VIEW_PAGE]: (state, action) => {
    const pageKey = action.payload.pageKey;
    const pageList = state.pageList.map((page: PageItem) => {
      if (page.pageKey === pageKey) {
        return { ...page, ...action.payload }
      }
      return page;
    })
    return { ...state, pageList };
  },
});
