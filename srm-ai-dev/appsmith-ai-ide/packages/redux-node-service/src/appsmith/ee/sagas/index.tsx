export * from "ce/sagas";
import { sagas as CE_Sagas } from "ce/sagas";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { call, all, spawn, race, take } from "redux-saga/effects";
import log from "loglevel";
import packageSagas from "./PackageSagas";
import ModuleSagas from "./ModuleSagas";
import ModuleActionSagas from "./moduleActionSagas";
import moduleInstanceSagas from "./moduleInstanceSagas";
import multiPagesSagas from './MultiPageSaga';

export const sagasArr = [
  ...CE_Sagas,
  packageSagas,
  ModuleSagas,
  ModuleActionSagas,
  moduleInstanceSagas,
  multiPagesSagas,
];

export function* rootSaga(sagasToRun = sagasArr): any {
  // This race effect ensures that we fail as soon as the first safe crash is dispatched.
  // Without this, all the subsequent safe crash failures would be shown in the toast messages as well.
  const result = yield race({
    running: all(
      sagasToRun.map((saga) =>
        spawn(function* () {
          while (true) {
            try {
              yield call(saga);
              break;
            } catch (e) {
              log.error(e);
              console.error(e);
            }
          }
        }),
      ),
    ),
    crashed: take(ReduxActionTypes.SAFE_CRASH_APPSMITH),
  });
  if (result.crashed) yield call(rootSaga);
}
