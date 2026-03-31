import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { type PageItem } from "@appsmith/reducers/pagesReducer";
import { all, takeLatest, put, select, call } from "redux-saga/effects";
import { getPageList, getActivePageKey } from "selectors/pageSelectors";

const PAGE_JSON_STORAGE_KEY = '__open_pages_info';

export const getPageInitJson = () => {
  const str = sessionStorage.getItem(PAGE_JSON_STORAGE_KEY);
  try {
    const data = JSON.parse(str || '{}')
    return data;
  } catch (error) {
    return {};
  }
}

export function* SavePageInfoSaga() {
  let pageList: PageItem[] = yield select(getPageList);
  pageList = pageList.filter(page => !page.isDisconnected);
  let activePageKey: string | null = yield select(getActivePageKey);
  if (!pageList.some(page => page.pageKey === activePageKey)) {
    activePageKey = pageList[0]?.pageKey;
  }
  sessionStorage.setItem(PAGE_JSON_STORAGE_KEY, JSON.stringify({
    pageList,
    activePageKey,
  }))
}

export default function* multiPagesSagas() {
  yield all([
    takeLatest(ReduxActionTypes.INIT_HOME_VIEW_PAGE, SavePageInfoSaga),
    takeLatest(ReduxActionTypes.OPEN_NEW_VIEW_PAGE, SavePageInfoSaga),
    takeLatest(ReduxActionTypes.CLOSE_VIEW_PAGE, SavePageInfoSaga),
    takeLatest(ReduxActionTypes.CLOSE_OTHER_VIEW_PAGE, SavePageInfoSaga),
    takeLatest(ReduxActionTypes.CLOSE_ALL_VIEW_PAGE, SavePageInfoSaga),
    takeLatest(ReduxActionTypes.CHANGE_VIEW_PAGE, SavePageInfoSaga),
    takeLatest(ReduxActionTypes.UPDATE_VIEW_PAGE, SavePageInfoSaga),
  ]);
}
