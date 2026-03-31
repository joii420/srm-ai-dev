import { setLintingErrors } from "actions/lintingActions";
import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { APP_MODE } from "entities/App";
import { call, put, select, takeEvery } from "redux-saga/effects";
import { getAppMode } from "@appsmith/selectors/entitiesSelector";
import type { JSLibrary } from "workers/common/JSLibrary";
import { logLatestLintPropertyErrors } from "./PostLintingSagas";
import { getAppsmithConfigs } from "@appsmith/configs";
import type { AppState } from "@appsmith/reducers";
import type { LintError } from "utils/DynamicBindingUtils";
import { get, set, uniq } from "lodash";
import type { LintErrorsStore } from "reducers/lintingReducers/lintErrorsReducers";
import type { TJSPropertiesState } from "workers/Evaluation/JSObject/jsPropertiesState";
import type {
  LintTreeRequestPayload,
  LintTreeResponse,
  LintTreeSagaRequestData,
} from "plugins/Linting/types";
import type { getUnevaluatedDataTree } from "selectors/dataTreeSelectors";
import { getEntityNameAndPropertyPath } from "@appsmith/workers/Evaluation/evaluationUtils";
import { Linter } from "plugins/Linting/Linter";
import log from "loglevel";
import { getFixedTimeDifference } from "workers/common/DataTreeEvaluator/utils";
import { selectFeatureFlags } from "@appsmith/selectors/featureFlagsSelectors";

const APPSMITH_CONFIGS = getAppsmithConfigs();

export const lintWorker = new Linter();

function* updateLintGlobals(
  action: ReduxAction<{ add?: boolean; libs: JSLibrary[] }>,
) {
  const appMode: APP_MODE = yield select(getAppMode);
  const isEditorMode = appMode === APP_MODE.EDIT;
  if (!isEditorMode) return;
  yield call(lintWorker.updateJSLibraryGlobals, action.payload);
}

function* updateOldJSCollectionLintErrors(
  lintedJSPaths: string[],
  errors: LintErrorsStore,
  jsObjectsState: TJSPropertiesState,
) {
  const jsEntities = uniq(
    lintedJSPaths.map((path) => getEntityNameAndPropertyPath(path).entityName),
  );
  const updatedJSCollectionLintErrors: LintErrorsStore = {};
  for (const jsObjectName of jsEntities) {
    const jsObjectBodyPath = `["${jsObjectName}.body"]`;
    const oldJsBodyLintErrors: LintError[] = yield select((state: AppState) =>
      get(state.linting.errors, jsObjectBodyPath, []),
    );
    const newJSBodyLintErrors = get(
      errors,
      jsObjectBodyPath,
      [] as LintError[],
    );

    const jsObjectState = get(jsObjectsState, jsObjectName, {});
    const jsObjectProperties = Object.keys(jsObjectState).map(
      (propertyName) => `${jsObjectName}.${propertyName}`,
    );

    // const filteredOldJsObjectBodyLintErrors = oldJsBodyLintErrors.filter(
    //   (lintError) =>
    //     lintError.originalPath &&
    //     jsObjectProperties.includes(lintError.originalPath) &&
    //     !lintedJSPaths.includes(lintError.originalPath),
    // );
    // const updatedLintErrors = [
    //   ...filteredOldJsObjectBodyLintErrors,
    //   ...newJSBodyLintErrors,
    // ];

    const updatedLintErrors: LintError[] = newJSBodyLintErrors.filter(lintError => !lintError.originalPath);
    jsObjectProperties.forEach(key => {
      if (!lintedJSPaths.includes(key)) {
        updatedLintErrors.push(...oldJsBodyLintErrors.filter(
          (lintError) =>
            lintError.originalPath &&
            lintError.originalPath === key,
        ));
      }
      updatedLintErrors.push(...newJSBodyLintErrors.filter(
        (lintError) =>
          lintError.originalPath &&
          lintError.originalPath === key,
      ));
    });

    set(updatedJSCollectionLintErrors, jsObjectBodyPath, updatedLintErrors);
  }
  return updatedJSCollectionLintErrors;
}

export function* lintTreeSaga(payload: LintTreeSagaRequestData) {
  const { configTree, forceLinting, unevalTree } = payload;

  const lintTreeRequestData: LintTreeRequestPayload = {
    unevalTree,
    configTree,
    cloudHosting: !!APPSMITH_CONFIGS.cloudHosting,
    forceLinting,
  };

  const { errors, jsPropertiesState, lintedJSPaths, bigStringMap }: LintTreeResponse =
    yield call(lintWorker.lintTree, lintTreeRequestData);

  // 源码修改: 报错信息包含源码字符串, 如果多个报错使用同一份源码字符串, 并且通过postMessage发送给主线程的时候
  // 相同字符串会被强制储存在多分内存中, 导致内存占用变大, 这里通过一个对象做字符串映射, 再在主程序还原报错信息
  // 这样浏览器针对相同字符串内存存储的优化就能生效
  if (bigStringMap && Object.keys(bigStringMap).length) {
    Object.keys(errors).forEach(key => {
      (errors[key] || []).forEach(item => {
        if (item.rawId) {
          item.raw = bigStringMap[item.rawId] || item.raw;
          delete item.rawId;
        }
        if (item.originalBindingId) {
          item.originalBinding = bigStringMap[item.originalBindingId] || item.originalBinding;
          delete item.originalBindingId;
        }
      })
    });
  }

  const updatedOldJSCollectionLintErrors: LintErrorsStore =
    yield updateOldJSCollectionLintErrors(
      lintedJSPaths,
      errors,
      jsPropertiesState,
    );

  const updatedErrors = { ...errors, ...updatedOldJSCollectionLintErrors };

  yield put(setLintingErrors(updatedErrors));
  yield call(logLatestLintPropertyErrors, {
    errors: updatedErrors,
    dataTree: unevalTree,
  });
}

export function* initiateLinting(
  unEvalAndConfigTree: ReturnType<typeof getUnevaluatedDataTree>,
  forceLinting: boolean,
) {
  const lintingStartTime = performance.now();
  const { configTree, unEvalTree: unevalTree } = unEvalAndConfigTree;

  yield call(lintTreeSaga, {
    unevalTree,
    configTree,
    forceLinting,
  });
  log.debug({
    lintTime: getFixedTimeDifference(performance.now(), lintingStartTime),
  });
}

export default function* lintTreeSagaWatcher() {
  yield takeEvery(ReduxActionTypes.UPDATE_LINT_GLOBALS, updateLintGlobals);
  yield takeEvery(ReduxActionTypes.LINT_SETUP, setupSaga);
}

export function* setupSaga(): any {
  const featureFlags = yield select(selectFeatureFlags);
  yield call(lintWorker.setup, featureFlags);
}
