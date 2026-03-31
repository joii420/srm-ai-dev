import type { ApiResponse } from "api/ApiResponses";
import LibraryApi from "api/LibraryAPI";
import {
  createMessage,
  customJSLibraryMessages,
} from "@appsmith/constants/messages";
import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import {
  ReduxActionErrorTypes,
  ReduxActionTypes,
} from "@appsmith/constants/ReduxActionConstants";
import type { ActionPattern } from "redux-saga/effects";
import {
  actionChannel,
  all,
  call,
  put,
  select,
  take,
  takeEvery,
  takeLatest,
} from "redux-saga/effects";
import {
  getCurrentApplicationId,
  getCurrentPageName,
  getIsModelWorkspace,
} from "selectors/editorSelectors";
import CodemirrorTernService from "utils/autocomplete/CodemirrorTernService";
import { EVAL_WORKER_ACTIONS } from "@appsmith/workers/Evaluation/evalWorkerActions";
import { validateResponse } from "./ErrorSagas";
import { EvalWorker } from "./EvaluationsSaga";
import log from "loglevel";
import { APP_MODE } from "entities/App";
import { getAppMode } from "@appsmith/selectors/applicationSelectors";
import AnalyticsUtil from "@appsmith/utils/AnalyticsUtil";
import type { JSLibrary } from "workers/common/JSLibrary";
import { getUsedActionNames } from "selectors/actionSelectors";
import AppsmithConsole from "utils/AppsmithConsole";
import { selectInstalledLibraries } from "@appsmith/selectors/entitiesSelector";
import { toast } from "../stubs/toast";
import { endSpan, startRootSpan } from "UITelemetry/generateTraces";
import { getFromServerWhenNoPrefetchedResult } from "./helper";
import type { AxiosResponse } from "axios";
import { matchEditorPath } from "@appsmith/constants/routes/appRoutes";
import ConsolidatedPageLoadApi from "api/ConsolidatedPageLoadApi";

export function parseErrorMessage(text: string) {
  return text.split(": ").slice(1).join("");
}

// TODO: 需要删除com
// const CUSTOM_JS_LIBS = ["com", "lib"];
const CUSTOM_JS_LIBS = [];
const getCustomJsLibConfig = (name: string) => {
  const customDefs = {
    "!name": `LIB/${name}`,
  };
  return {
    accessor: [name],
    defs: JSON.stringify(customDefs),
    name: name,
    docsURL: "",
    url: `/step/js/build/${name}.js`,
    version: "1.0.0",
  };
};

const getJsUrl = (key: string, list: any[]) => {
  const str = `
    (function (global, factory) {
      typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
      typeof define === 'function' && define.amd ? define(['exports'], factory) :
      (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.${key} = {}));
    })(this, (function (exports) { 'use strict';
      ${list
        .map((item: any) => {
          const fnStr =
            item.funcString ||
            `const ${item.funcName} = ${item.async ? "async" : ""} () => {}`;
          return `
          ${fnStr}
          exports.${item.funcName} = ${item.funcName};
        `;
        })
        .join("\n")}
    }))
  `;
  
  // TODO: 【临时修改】node不适用blob url
  // Node.js: Blob/URL.createObjectURL not available, use data URI
  // if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
  //   const blob = new Blob([str], { type: "application/javascript" });
  //   return URL.createObjectURL(blob);
  // }
  // Fallback: return data URI
  return `data:application/javascript;base64,${Buffer.from(str).toString("base64")}`;
};

const getLocalJsLibConfig = (name: string, url: string) => {
  const customDefs = {
    "!name": `LIB/${name}`,
  };
  return {
    accessor: [name],
    defs: JSON.stringify(customDefs),
    name: name,
    docsURL: "",
    url,
    version: "1.0.0",
  };
};

function* handleInstallationFailure(
  url: string,
  message: string,
  accessor?: string[],
) {
  if (accessor) {
    yield call(
      EvalWorker.request,
      EVAL_WORKER_ACTIONS.UNINSTALL_LIBRARY,
      accessor,
    );
  }

  AppsmithConsole.error({
    text: `Failed to install library script at ${url}`,
  });

  toast.show(message || `Failed to install library script at ${url}`, {
    kind: "error",
  });
  const applicationid: ReturnType<typeof getCurrentApplicationId> =
    yield select(getCurrentApplicationId);
  yield put({
    type: ReduxActionErrorTypes.INSTALL_LIBRARY_FAILED,
    payload: { url, show: false },
  });
  AnalyticsUtil.logEvent("INSTALL_LIBRARY", {
    url,
    success: false,
    applicationid,
  });
  log.error(message);
}

export function* installLibrarySaga(lib: Partial<JSLibrary>) {
  const { url } = lib;

  const takenNamesMap: Record<string, true> = yield select(
    getUsedActionNames,
    "",
  );

  const installedLibraries: JSLibrary[] = yield select(
    selectInstalledLibraries,
  );

  const alreadyInstalledLibrary = installedLibraries.find(
    (library) => library.url === url,
  );

  if (alreadyInstalledLibrary) {
    toast.show(
      createMessage(
        customJSLibraryMessages.INSTALLED_ALREADY,
        alreadyInstalledLibrary.accessor,
      ),
      {
        kind: "info",
      },
    );
    return;
  }

  const takenAccessors = ([] as string[]).concat(
    ...installedLibraries.map((lib) => lib.accessor),
  );

  const { accessor, defs, error, success } = yield call(
    EvalWorker.request,
    EVAL_WORKER_ACTIONS.INSTALL_LIBRARY,
    {
      url,
      takenNamesMap,
      takenAccessors,
    },
  );

  if (!success) {
    log.debug("Failed to install locally");
    yield call(handleInstallationFailure, url as string, error?.message);
    return;
  }

  const name: string = lib.name || accessor[accessor.length - 1];
  const applicationId: string = yield select(getCurrentApplicationId);

  const versionMatch = (url as string).match(/(?:@)(\d+\.)(\d+\.)(\d+)/);
  let [version = ""] = versionMatch ? versionMatch : [];
  version = version.startsWith("@") ? version.slice(1) : version;
  version = version || lib?.version || "";

  let stringifiedDefs = "";

  try {
    stringifiedDefs = JSON.stringify(defs);
  } catch (e) {
    stringifiedDefs = JSON.stringify({
      "!name": `LIB/${accessor[accessor.length - 1]}`,
    });
  }

  const response: ApiResponse<boolean> = yield call(
    LibraryApi.addLibrary,
    applicationId,
    {
      name,
      version,
      accessor,
      defs: stringifiedDefs,
      url,
    },
  );

  try {
    const isValidResponse: boolean = yield validateResponse(response, false);
    if (!isValidResponse || !response.data) {
      log.debug("Install API failed");
      yield call(handleInstallationFailure, url as string, "", accessor);
      return;
    }
  } catch (e) {
    yield call(
      handleInstallationFailure,
      url as string,
      (e as Error).message,
      accessor,
    );
    return;
  }

  try {
    CodemirrorTernService.updateDef(defs["!name"], defs);
    AnalyticsUtil.logEvent("DEFINITIONS_GENERATION", { url, success: true });
  } catch (e) {
    toast.show(
      createMessage(customJSLibraryMessages.AUTOCOMPLETE_FAILED, name),
      {
        kind: "warning",
      },
    );
    AppsmithConsole.warning({
      text: `Failed to generate code definitions for ${name}`,
    });
    AnalyticsUtil.logEvent("DEFINITIONS_GENERATION", { url, success: false });
    log.debug("Failed to update Tern defs", e);
  }

  yield put({
    type: ReduxActionTypes.UPDATE_LINT_GLOBALS,
    payload: {
      libs: [
        {
          name,
          version,
          url,
          accessor,
        },
      ],
      add: true,
    },
  });

  yield put({
    type: ReduxActionTypes.INSTALL_LIBRARY_SUCCESS,
    payload: {
      url,
      accessor,
      version,
      name,
    },
  });

  toast.show(
    createMessage(
      customJSLibraryMessages.INSTALLATION_SUCCESSFUL,
      accessor[accessor.length - 1],
    ),
    {
      kind: "success",
    },
  );
  AnalyticsUtil.logEvent("INSTALL_LIBRARY", {
    url,
    namespace: accessor.join("."),
    success: true,
    applicationId,
  });

  AppsmithConsole.info({
    text: `${name} installed successfully`,
  });
}

function* uninstallLibrarySaga(action: ReduxAction<JSLibrary>) {
  const { accessor, name } = action.payload;
  const applicationId: string = yield select(getCurrentApplicationId);

  try {
    const response: ApiResponse = yield call(
      LibraryApi.removeLibrary,
      applicationId,
      action.payload,
    );

    const isValidResponse: boolean = yield validateResponse(response);

    if (!isValidResponse) {
      yield put({
        type: ReduxActionErrorTypes.UNINSTALL_LIBRARY_FAILED,
        payload: accessor,
      });
      AnalyticsUtil.logEvent("UNINSTALL_LIBRARY", {
        url: action.payload.url,
        success: false,
      });
      return;
    }

    yield put({
      type: ReduxActionTypes.UPDATE_LINT_GLOBALS,
      payload: {
        libs: [action.payload],
        add: false,
      },
    });

    const { success }: { success: boolean } = yield call(
      EvalWorker.request,
      EVAL_WORKER_ACTIONS.UNINSTALL_LIBRARY,
      accessor,
    );
    if (!success) {
      toast.show(
        createMessage(customJSLibraryMessages.UNINSTALL_FAILED, name),
        {
          kind: "error",
        },
      );
    }

    try {
      CodemirrorTernService.removeDef(`LIB/${accessor[accessor.length - 1]}`);
    } catch (e) {
      log.debug(`Failed to remove definitions for ${name}`, e);
    }

    yield put({
      type: ReduxActionTypes.UNINSTALL_LIBRARY_SUCCESS,
      payload: action.payload,
    });

    toast.show(createMessage(customJSLibraryMessages.UNINSTALL_SUCCESS, name), {
      kind: "success",
    });
    AnalyticsUtil.logEvent("UNINSTALL_LIBRARY", {
      url: action.payload.url,
      success: true,
    });
  } catch (e) {
    toast.show(createMessage(customJSLibraryMessages.UNINSTALL_FAILED, name), {
      kind: "error",
    });
    AnalyticsUtil.logEvent("UNINSTALL_LIBRARY", {
      url: action.payload.url,
      success: false,
    });
  }
}

function* fetchJSLibraries(
  action: ReduxAction<{
    applicationId: string;
    customJSLibraries: ApiResponse;
  }>,
) {
  const span = startRootSpan("fetchJSLibraries");
  const { applicationId, customJSLibraries } = action.payload;
  const mode: APP_MODE = yield select(getAppMode);

  try {
    const response: ApiResponse = yield call(
      getFromServerWhenNoPrefetchedResult,
      customJSLibraries,
      () => call(LibraryApi.getLibraries, applicationId, mode),
    );

    const isValidResponse: boolean = yield validateResponse(response);
    if (!isValidResponse) {
      endSpan(span);
      return;
    }

    const libraries = response.data as Array<JSLibrary & { defs: string }>;

    // multiple libs
    CUSTOM_JS_LIBS.forEach((name) =>
      libraries.push(getCustomJsLibConfig(name)),
    );

    const isModelWorkspace: boolean = yield select(getIsModelWorkspace);
    const isEdit = mode === APP_MODE.EDIT;
    const match = matchEditorPath(window.location.pathname);
    const applicationSlug = (match?.params as any)?.applicationSlug || "";
    const pageSlug = ((match?.params as any)?.pageSlug || "").replace(/-$/, "");
    const isModalPage = isModelWorkspace || applicationSlug === "m01" || /^modal/.test(pageSlug);
    if (isEdit) {
      // TODO: 【临时修改】不加载com
      // const res: AxiosResponse = yield call(LibraryApi.getCustomLibraries);
      // const data = res.data.data || {};
      const data = {
        com: [],
        lib: [],
        mobile: [],
        pms: [],
        sub: [],
      };

      Object.keys(data).forEach((key) => {
        // TODO: 暂时不注入
        if (CUSTOM_JS_LIBS.includes(key)) return;
        const url = getJsUrl(key, data[key]);
        libraries.push(getLocalJsLibConfig(key, url));
      });

      // TODO: 【临时修改】不加载关联modal
      // const modalRes: { data: any } = yield call(
      //   LibraryApi.getPageModalList,
      //   pageSlug,
      // );
      // const modalList = modalRes?.data?.data || [];
      const modalList = [];

      if (modalList.length) {
        yield Promise.all(
          modalList.map(async (item: any) => {
            const res: any =
              await ConsolidatedPageLoadApi.getConsolidatedPageLoadDataView({
                defaultPageId: item.pageId,
                viewPageId: item.pageId,
              });

            res.data.publishedActionCollections.data.forEach((item: any) => {
              const str = `
                (function (global, factory) {
                  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
                  typeof define === 'function' && define.amd ? define(['exports'], factory) :
                  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.${item.name} = {}));
                })(this, (function (exports) { 'use strict';
                  let obj = {};
                  ${item.body.replace(/^\s*export\s+default/, "obj = ")};
                  Object.assign(exports, obj);
                }))
              `;
              const blob = new Blob([str], {
                type: "application/javascript",
              });
              const url = URL.createObjectURL(blob);
              libraries.push(getLocalJsLibConfig(item.name, url));
            });
          }),
        );
      }
    }

    const {
      message,
      success,
      defsMap,
    }: { success: boolean; message: string; defsMap: any } = yield call(
      EvalWorker.request,
      EVAL_WORKER_ACTIONS.LOAD_LIBRARIES,
      libraries.map((lib) => ({
        name: lib.name,
        version: lib.version,
        url: lib.url,
        accessor: lib.accessor,
        makeDefs: isEdit,
      })),
    );

    if (!success) {
      if (mode === APP_MODE.EDIT) {
        yield put({
          type: ReduxActionTypes.FETCH_JS_LIBRARIES_SUCCESS,
          payload: libraries.map((lib) => ({
            name: lib.name,
            accessor: lib.accessor,
            version: lib.version,
            url: lib.url,
            docsURL: lib.docsURL,
          })),
        });
        toast.show(parseErrorMessage(message), {
          kind: "warning",
        });
      } else {
        yield put({
          type: ReduxActionErrorTypes.FETCH_JS_LIBRARIES_FAILED,
        });
      }
      endSpan(span);
      return;
    }

    if (mode === APP_MODE.EDIT) {
      const ignoreJsList = ["INIT", "PROCESS", "VALID", "GLOBAL", "COMMON"];
      if (isModalPage) {
        ignoreJsList.forEach((key) => {
          libraries.push(getLocalJsLibConfig(key, getJsUrl(key, [])));
          defsMap[key] = {
            "!name": key,
            [key]: { "!type": "?" },
          };
        });
      }

      for (const lib of libraries) {
        try {
          const defs = JSON.parse(lib.defs);
          CodemirrorTernService.updateDef(
            defs["!name"],
            defsMap[lib.name] || defs,
          );
          // 源码修改：用于com等脚本下级属性信息的记录
          const key = lib.accessor[0];
          const def = defsMap[key]?.[key];
          if (def && !ignoreJsList.includes(key)) {
            const keys = Object.keys(def);
            if (keys.length) {
              lib.lintGlobalData = keys.reduce((data: any, k) => {
                data[k] = true;
                return data;
              }, {});
            }
          }
        } catch (e) {
          toast.show(
            createMessage(
              customJSLibraryMessages.AUTOCOMPLETE_FAILED,
              lib.name,
            ),
            {
              kind: "info",
            },
          );
        }
      }
      yield put({
        type: ReduxActionTypes.UPDATE_LINT_GLOBALS,
        payload: {
          libs: libraries,
        },
      });
    }

    yield put({
      type: ReduxActionTypes.FETCH_JS_LIBRARIES_SUCCESS,
      payload: libraries.map((lib) => ({
        name: lib.name,
        accessor: lib.accessor,
        version: lib.version,
        url: lib.url,
        docsURL: lib.docsURL,
        id: lib.id,
      })),
    });
  } catch (e) {
    yield put({
      type: ReduxActionErrorTypes.FETCH_JS_LIBRARIES_FAILED,
    });
  }
  endSpan(span);
}

function* startInstallationRequestChannel() {
  const queueInstallChannel: ActionPattern<any> = yield actionChannel([
    ReduxActionTypes.INSTALL_LIBRARY_INIT,
  ]);
  while (true) {
    const action: ReduxAction<Partial<JSLibrary>> =
      yield take(queueInstallChannel);
    yield put({
      type: ReduxActionTypes.INSTALL_LIBRARY_START,
      payload: action.payload.url,
    });
    yield call(installLibrarySaga, action.payload);
  }
}

export default function* () {
  yield all([
    takeEvery(ReduxActionTypes.UNINSTALL_LIBRARY_INIT, uninstallLibrarySaga),
    takeLatest(ReduxActionTypes.FETCH_JS_LIBRARIES_INIT, fetchJSLibraries),
    call(startInstallationRequestChannel),
  ]);
}
