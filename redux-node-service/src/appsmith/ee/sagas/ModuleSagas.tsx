import {
  ReduxActionTypes,
  ReduxActionErrorTypes,
} from "@appsmith/constants/ReduxActionConstants";
import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import {
  all,
  takeLatest,
  put,
  select,
  call,
  fork,
  takeEvery,
} from "redux-saga/effects";
import { getCurrentWorkspaceId } from "@appsmith/selectors/selectedWorkspaceSelectors";
import PackageApi from "@appsmith/api/PackageApi";
import { Module, ModuleType } from "@appsmith/constants/PackageConstants";
import type {
  CreateModulePayload,
  CreateModuleResponse,
  InputRefactorNamePayload,
  ModuleEntitiesResponse,
} from "@appsmith/api/PackageApi";
import { validateResponse } from "sagas/ErrorSagas";
import history from "utils/history";
import { createDefaultApiActionPayload } from "sagas/ApiPaneSagas";
import { PluginPackageName, PluginType } from "entities/Action";
import type { ApiAction, Action, QueryAction } from "entities/Action";
import { createDefaultActionPayloadWithPluginDefaults } from "sagas/ActionSagas";
import { createDummyJSCollectionActions } from "utils/JSPaneUtils";
import { getCurrentPackageModules } from "@appsmith/selectors/packageSelectors";
import { omit } from "lodash";
import { generateInputId } from "utils/generators";
import { getNextEntityName } from "utils/AppsmithUtils";
import { generateDefaultJSObject } from "sagas/JSPaneSagas";
import type {
  CreateJSCollectionRequest,
  RefactorAction,
  UpdateCollectionActionNameRequest,
} from "@appsmith/api/JSActionAPI";
import {
  currentPackageEditorURL,
  moduleEditorURL,
} from "@appsmith/RouteBuilder";
import {
  getCurrentModuleId,
  getModuleDetail,
  getModulePublicAction,
} from "@appsmith/selectors/modulesSelector";
import { executePageLoadActions } from "actions/pluginActionActions";
import { initialize } from "redux-form";
import { resetDebuggerLogs } from "sagas/InitSagas";
import type { CreateQueryModulePayload } from "@appsmith/actions/moduleActions";
import type { JSCollection } from "entities/JSCollection";
import type { ApiResponse } from "api/ApiResponses";
import JSActionAPI from "@appsmith/api/JSActionAPI";

export function* createQueryModuleSaga(
  action: ReduxAction<CreateQueryModulePayload>,
) {
  const {
    apiType = PluginPackageName.REST_API,
    datasourceId,
    from,
    packageId,
  } = action.payload;
  try {
    let entity = {};
    if (datasourceId) {
      // create db query
      const createActionPayload: Partial<Action> =
        yield createDefaultActionPayloadWithPluginDefaults({
          datasourceId,
          from,
        });
      entity = omit(createActionPayload, "name");
    } else {
      // create api or graghql api
      const createApiActionPayload: Partial<ApiAction> =
        yield createDefaultApiActionPayload({
          apiType,
          from,
        });
      entity = omit(createApiActionPayload, "name");
    }
    const modules: any[] = yield select(getCurrentPackageModules);
    const request: CreateModulePayload = {
      name: getNextEntityName(
        "QueryModule",
        modules.map((el: any) => el.name),
      ),
      type: ModuleType.QUERY_MODULE,
      packageId,
      entity: {
        type: "ACTION",
        ...entity,
      },
      inputsForm: [
        {
          id: generateInputId(),
          sectionName: "",
          children: [],
        },
      ],
    };

    const response: CreateModuleResponse = yield call(
      PackageApi.createModule,
      request,
    );
    const isValidResponse: boolean = yield validateResponse(response);
    if (isValidResponse) {
      yield put({
        type: ReduxActionTypes.CREATE_QUERY_MODULE_SUCCESS,
        payload: response.data,
      });
      // jump to module detail
      history.push(moduleEditorURL({ moduleId: response.data.id }));
      yield fork(resetDebuggerLogs);
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.CREATE_QUERY_MODULE_ERROR,
      payload: {
        error,
      },
    });
  }
}

export function* createJSModuleSaga(
  action: ReduxAction<{
    packageId: string;
  }>,
) {
  const { packageId } = action.payload;
  try {
    const workspaceId: string = yield select(getCurrentWorkspaceId);
    const { actions, body, variables } = createDummyJSCollectionActions(
      workspaceId,
      {
        packageId,
      },
    );
    const modules: any[] = yield select(getCurrentPackageModules);
    const newJSModuleName = getNextEntityName(
      "JSModule",
      modules.map((el: any) => el.name),
    );
    const defaultJSObject: CreateJSCollectionRequest =
      yield generateDefaultJSObject({
        name: newJSModuleName,
        workspaceId,
        actions,
        body,
        variables,
      });

    const request: CreateModulePayload = {
      name: newJSModuleName,
      type: ModuleType.JS_MODULE,
      packageId,
      entity: {
        type: "JS_OBJECT",
        ...defaultJSObject,
      },
    };

    const response: CreateModuleResponse = yield call(
      PackageApi.createModule,
      request,
    );
    const isValidResponse: boolean = yield validateResponse(response);
    if (isValidResponse) {
      yield put({
        type: ReduxActionTypes.CREATE_JS_MODULE_SUCCESS,
        payload: response.data,
      });

      // jump to module detail
      history.push(moduleEditorURL({ moduleId: response.data.id }));
      yield fork(resetDebuggerLogs);
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.CREATE_JS_MODULE_ERROR,
      payload: {
        error,
      },
    });
  }
}

export function* deleteModuleSaga(
  action: ReduxAction<{ moduleId: string; onSuccess: () => void }>,
) {
  try {
    const response: CreateModuleResponse = yield call(
      PackageApi.deleteModule,
      action.payload.moduleId,
    );
    const isValidResponse: boolean = yield validateResponse(response);
    if (isValidResponse) {
      yield put({
        type: ReduxActionTypes.DELETE_MODULE_SUCCESS,
        payload: response.data,
      });
      if (!!action.payload.onSuccess) {
        action.payload.onSuccess();
      } else {
        history.push(currentPackageEditorURL());
      }
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.DELETE_MODULE_ERROR,
      payload: {
        error,
      },
    });
  }
}

export function* fetchModuleEntitiesSaga(
  action: ReduxAction<{ moduleId: string }>,
) {
  try {
    const { moduleId } = action.payload;
    yield put({
      type: ReduxActionTypes.SET_CURRENT_MODULE_ID,
      payload: {
        id: moduleId,
      },
    });
    const module: Module = yield select(getModuleDetail, moduleId);
    const inputsForm = module?.inputsForm || [];
    const response: ModuleEntitiesResponse = yield call(
      PackageApi.fetchModuleEntities,
      moduleId,
    );
    const isValidResponse: boolean = yield validateResponse(response);
    if (isValidResponse) {
      const entities = response.data;
      // add inputs to action, as form init value
      if (inputsForm.length) {
        entities.actions = entities.actions.map((action) => ({
          ...action,
          inputsForm,
        }));
      }
      yield put({
        type: ReduxActionTypes.FETCH_MODULE_ENTITIES_SUCCESS,
        payload: entities,
      });
      // start eval
      yield put({
        type: ReduxActionTypes.FETCH_ALL_MODULE_ENTITY_COMPLETION,
        postEvalActions: [executePageLoadActions()],
        payload: undefined,
      });
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.FETCH_MODULE_ENTITIES_ERROR,
      payload: {
        error,
      },
    });
  }
}

export function* refactorModuleNameSaga(
  action: ReduxAction<{ id: string; name: string }>,
) {
  try {
    const { id, name } = action.payload;
    const module: Module = yield select(getModuleDetail, id);
    const currentModuleId: string = yield select(getCurrentModuleId);
    const response: CreateModuleResponse = yield call(
      PackageApi.refactorModuleName,
      {
        moduleId: id,
        oldName: module.name,
        newName: name,
      },
    );
    const isValidResponse: boolean = yield validateResponse(response);
    if (isValidResponse) {
      yield put({
        type: ReduxActionTypes.REFACTOR_MODULE_NAME_SUCCESS,
        payload: response.data,
      });
      if (currentModuleId === id) {
        yield call(fetchModuleEntitiesSaga, {
          type: ReduxActionTypes.FETCH_MODULE_ENTITIES_INIT,
          payload: { moduleId: id },
        });
      }
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.REFACTOR_MODULE_NAME_ERROR,
      payload: {
        error,
      },
    });
  }
}

export function* updateModuleSaga(action: ReduxAction<Module>) {
  try {
    const { id, inputsForm } = action.payload;
    const currentModule: Module = yield select(getModuleDetail, id);
    const module = {
      ...omit(currentModule, "metaData"),
      inputsForm,
    };
    const response: CreateModuleResponse = yield call(
      PackageApi.updateModule,
      module,
    );
    const isValidResponse: boolean = yield validateResponse(response);
    if (isValidResponse) {
      yield put({
        type: ReduxActionTypes.UPDATE_MODULE_SUCCESS,
        payload: response.data,
      });
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.UPDATE_MODULE_ERROR,
      payload: {
        error,
      },
    });
  }
}

export function* refactorModuleInputNameSaga(
  action: ReduxAction<InputRefactorNamePayload>,
) {
  try {
    const { formName = "", ...refactorInfo } = action.payload;
    const response: CreateModuleResponse = yield call(
      PackageApi.refactorModuleInputName,
      refactorInfo,
    );
    const isValidResponse: boolean = yield validateResponse(response);
    if (isValidResponse) {
      // update inputsForm in module
      yield put({
        type: ReduxActionTypes.REFACTOR_MODULE_INPUT_NAME_SUCCESS,
        payload: response.data,
      });
      // update module action
      yield call(fetchModuleEntitiesSaga, {
        type: ReduxActionTypes.FETCH_MODULE_ENTITIES_INIT,
        payload: {
          moduleId: refactorInfo.moduleId,
        },
      });
      // reinit redux-form value
      const publicAction: Action = yield select(
        getModulePublicAction,
        refactorInfo.moduleId,
      );
      yield put(initialize(formName, publicAction));
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.REFACTOR_MODULE_INPUT_NAME_ERROR,
      payload: {
        error,
      },
    });
  }
}

export function* handleRefactorJSActionNameSaga(
  data: ReduxAction<{
    refactorAction: RefactorAction;
    actionCollection: JSCollection;
  }>,
) {
  const { refactorAction } = data.payload;

  if (refactorAction.moduleId) {
    const requestData: UpdateCollectionActionNameRequest = {
      ...data.payload.refactorAction,
      actionCollection: data.payload.actionCollection,
      contextType: "MODULE",
    };
    // call to refactor action
    try {
      const refactorResponse: ApiResponse =
        yield JSActionAPI.updateJSCollectionActionRefactor(requestData);

      const isRefactorSuccessful: boolean =
        yield validateResponse(refactorResponse);

      if (isRefactorSuccessful) {
        yield call(fetchModuleEntitiesSaga, {
          payload: { moduleId: refactorAction.moduleId },
          type: ReduxActionTypes.FETCH_MODULE_ENTITIES_INIT,
        });

        yield put({
          type: ReduxActionTypes.REFACTOR_JS_ACTION_NAME_SUCCESS,
          payload: { collectionId: data.payload.actionCollection.id },
        });
      }
    } catch (error) {
      yield put({
        type: ReduxActionErrorTypes.REFACTOR_JS_ACTION_NAME_ERROR,
        payload: { collectionId: data.payload.actionCollection.id },
      });
    }
  }
}

export default function* moduleSagas() {
  yield all([
    takeLatest(
      ReduxActionTypes.CREATE_QUERY_MODULE_INIT,
      createQueryModuleSaga,
    ),
    takeLatest(ReduxActionTypes.CREATE_JS_MODULE_INIT, createJSModuleSaga),
    takeLatest(ReduxActionTypes.DELETE_MODULE_INIT, deleteModuleSaga),
    takeLatest(
      ReduxActionTypes.FETCH_MODULE_ENTITIES_INIT,
      fetchModuleEntitiesSaga,
    ),
    takeLatest(
      ReduxActionTypes.REFACTOR_MODULE_NAME_INIT,
      refactorModuleNameSaga,
    ),
    takeLatest(ReduxActionTypes.UPDATE_MODULE_INIT, updateModuleSaga),
    takeLatest(
      ReduxActionTypes.REFACTOR_MODULE_INPUT_NAME_INIT,
      refactorModuleInputNameSaga,
    ),
    takeEvery(
      ReduxActionTypes.REFACTOR_JS_ACTION_NAME,
      handleRefactorJSActionNameSaga,
    ),
  ]);
}
