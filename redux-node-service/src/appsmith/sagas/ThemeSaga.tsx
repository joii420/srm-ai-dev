import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { select, takeLatest } from "redux-saga/effects";
import localStorage from "utils/localStorage";
import type { ThemeMode } from "selectors/themeSelectors";
import { getCurrentThemeDetails } from "selectors/themeSelectors";
import { trimTrailingSlash } from "utils/helpers";

export interface BackgroundTheme {
  colors: { homepageBackground: string; appBackground: string };
}

export function changeAppBackground(_currentTheme: BackgroundTheme) {
  // Node.js: DOM style manipulation removed, theme data management preserved
}

export function* setThemeSaga(actionPayload: ReduxAction<ThemeMode>) {
  const theme: BackgroundTheme = yield select(getCurrentThemeDetails);
  changeAppBackground(theme);
  yield localStorage.setItem("THEME", actionPayload.payload);
}

export default function* themeSagas() {
  yield takeLatest(ReduxActionTypes.SET_THEME, setThemeSaga);
}
