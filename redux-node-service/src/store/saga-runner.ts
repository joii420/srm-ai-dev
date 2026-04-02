/**
 * Node.js saga runner.
 *
 * Re-uses the existing EE rootSaga and sagasArr from appsmith/ee/sagas/index.
 * Excludes PageVisibilitySaga (requires Page Visibility API, browser-only).
 */
import { call, all, spawn, race, take } from "redux-saga/effects";
import log from "loglevel";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";

// Import the full sagas array from the EE layer
// Using require to avoid import hoisting issues with module-stubs
const { sagasArr: allSagas } = require("@appsmith/sagas");

// Import PageVisibilitySaga to identify and exclude it
let PageVisibilitySaga: any;
try {
  PageVisibilitySaga = require("../appsmith/sagas/PageVisibilitySagas").default;
} catch {
  PageVisibilitySaga = null;
}

// Filter out PageVisibilitySaga (requires Page Visibility API)
const sagasArr = PageVisibilitySaga
  ? allSagas.filter((s: any) => s !== PageVisibilitySaga)
  : allSagas;

console.log(`[saga-runner] Registered ${sagasArr.length} sagas (excluded PageVisibilitySaga)`);

export function* rootSaga(sagasToRun = sagasArr): any {
  const result = yield race({
    running: all(
      sagasToRun.map((saga: any) =>
        spawn(function* () {
          while (true) {
            try {
              yield call(saga);
              break;
            } catch (e: any) {
              // Only log message + stack, not full Axios error objects
              const msg = e?.message || String(e);
              const stack = e?.stack?.split("\n").slice(0, 3).join("\n") || "";
              console.error(`[saga-error] ${msg}\n${stack}`);
            }
          }
        }),
      ),
    ),
    crashed: take(ReduxActionTypes.SAFE_CRASH_APPSMITH),
  });
  if (result.crashed) yield call(rootSaga);
}
