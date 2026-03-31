import { takeLatest, all, select, call, put } from "redux-saga/effects";
import {
  ReduxActionErrorTypes,
  ReduxActionTypes,
} from "@appsmith/constants/ReduxActionConstants";
import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import type { EventLocation } from "@appsmith/utils/analyticsUtilTypes";
import {
  type Action,
  type ApiAction,
  PluginPackageName,
} from "entities/Action";
import type {
  ActionData,
  ActionDataState,
} from "@appsmith/reducers/entityReducers/actionsReducer";
import {
  getActions,
  getJSCollection,
  getJSCollections,
} from "@appsmith/selectors/entitiesSelector";
import { createNewJSFunctionName } from "utils/AppsmithUtils";
import { createDefaultApiActionPayload } from "sagas/ApiPaneSagas";
import {
  createActionRequest,
  updateActionData,
} from "actions/pluginActionActions";
import { createDefaultActionPayloadWithPluginDefaults } from "sagas/ActionSagas";
import {
  ActionParentEntityType,
  CreateNewActionKey,
} from "@appsmith/entities/Engine/actionHelpers";
import { getCurrentWorkspaceId } from "@appsmith/selectors/selectedWorkspaceSelectors";
import type {
  JSCollectionData,
  JSCollectionDataState,
} from "@appsmith/reducers/entityReducers/jsActionsReducer";
import { createDummyJSCollectionActions } from "utils/JSPaneUtils";
import type { CreateJSCollectionRequest } from "@appsmith/api/JSActionAPI";
import { generateDefaultJSObject } from "sagas/JSPaneSagas";
import { createJSCollectionRequest } from "actions/jsActionActions";
import type { ApiResponse } from "api/ApiResponses";
import ActionAPI from "api/ActionAPI";
import { validateResponse } from "sagas/ErrorSagas";
import JSActionAPI from "@appsmith/api/JSActionAPI";
import type { JSCollection } from "entities/JSCollection";
import { toast } from "../../stubs/toast";
import {
  ERROR_ACTION_RENAME_FAIL,
  ERROR_JS_COLLECTION_RENAME_FAIL,
  createMessage,
} from "@appsmith/constants/messages";
import * as log from "loglevel";
import { fetchModuleEntitiesSaga } from "./ModuleSagas";

export function* createNewAPIActionForPackageSaga(
  action: ReduxAction<{
    moduleId: string;
    from: EventLocation;
    apiType?: string;
  }>,
) {
  const {
    apiType = PluginPackageName.REST_API,
    from,
    moduleId,
  } = action.payload;

  if (moduleId) {
    const createApiActionPayload: Partial<ApiAction> = yield call(
      createDefaultApiActionPayload,
      {
        apiType,
        from,
      },
    );

    yield put(
      createActionRequest({
        ...createApiActionPayload,
        moduleId,
        contextType: ActionParentEntityType.MODULE,
      }),
    );
  }
}

export function* createNewQueryActionForPackageSaga(
  action: ReduxAction<{
    moduleId: string;
    datasourceId: string;
    from: EventLocation;
  }>,
) {
  const { datasourceId, from, moduleId } = action.payload;

  const createActionPayload: Partial<Action> = yield call(
    createDefaultActionPayloadWithPluginDefaults,
    {
      datasourceId,
      from,
    },
  );

  yield put(
    createActionRequest({
      ...createActionPayload,
      moduleId,
      contextType: ActionParentEntityType.MODULE,
    }),
  );
}

export function* createNewSActionForPackageSaga(
  action: ReduxAction<{ moduleId: string; from: EventLocation }>,
) {
  const workspaceId: string = yield select(getCurrentWorkspaceId);
  const { from, moduleId } = action.payload;

  if (moduleId) {
    const jsActions: JSCollectionDataState = yield select(getJSCollections);
    const moduleJsActions = jsActions.filter(
      (a: JSCollectionData) => a.config.moduleId === moduleId,
    );
    const newJSCollectionName = createNewJSFunctionName(
      moduleJsActions,
      moduleId,
      CreateNewActionKey.MODULE,
    );
    const { actions, body, variables } =
      createDummyJSCollectionActions(workspaceId);

    const defaultJSObject: CreateJSCollectionRequest =
      yield generateDefaultJSObject({
        name: newJSCollectionName,
        workspaceId,
        actions,
        body,
        variables,
      });

    yield put(
      createJSCollectionRequest({
        from: from,
        request: {
          ...defaultJSObject,
          moduleId,
          contextType: ActionParentEntityType.MODULE,
        },
      }),
    );
  }
}

export function* refactorJSObjectName(
  id: string,
  moduleId: string,
  oldName: string,
  newName: string,
) {
  // call to refactor action
  const refactorResponse: ApiResponse =
    yield JSActionAPI.updateJSCollectionOrActionName({
      actionCollectionId: id,
      oldName: oldName,
      newName: newName,
      moduleId,
      contextType: ActionParentEntityType.MODULE,
    });

  const isRefactorSuccessful: boolean =
    yield validateResponse(refactorResponse);

  if (isRefactorSuccessful) {
    yield put({
      type: ReduxActionTypes.SAVE_JS_COLLECTION_NAME_SUCCESS,
      payload: {
        actionId: id,
      },
    });
    const jsObject: JSCollection = yield select((state) =>
      getJSCollection(state, id),
    );
    const functions = jsObject.actions;
    yield put(
      updateActionData(
        functions.map((f) => ({
          entityName: newName,
          data: undefined,
          dataPath: `${f.name}.data`,
          dataPathRef: `${oldName}.${f.name}.data`,
        })),
      ),
    );
  }
}

export function* refactorActionNameForPackage(
  id: string,
  moduleId: string,
  oldName: string,
  newName: string,
) {
  // call to refactor action
  const refactorResponse: ApiResponse = yield ActionAPI.updateActionName({
    actionId: id,
    oldName: oldName,
    newName: newName,
    moduleId,
    contextType: ActionParentEntityType.MODULE,
  });

  const isRefactorSuccessful: boolean =
    yield validateResponse(refactorResponse);

  if (isRefactorSuccessful) {
    yield put({
      type: ReduxActionTypes.SAVE_ACTION_NAME_FOR_PACKAGE_SUCCESS,
      payload: {
        actionId: id,
      },
    });
    yield put(
      updateActionData([
        {
          entityName: newName,
          dataPath: "data",
          data: undefined,
          dataPathRef: `${oldName}.data`,
        },
      ]),
    );
  }
}

export function* saveActionNameForPackageSaga(
  action: ReduxAction<{ id: string; name: string }>,
) {
  const { id, name } = action.payload;
  const actions: ActionDataState = yield select(getActions);
  const actionToBeUpdated: ActionData | undefined = actions.find(
    (action) => action.config.id === id,
  );
  const moduleId = actionToBeUpdated?.config.moduleId;

  try {
    if (moduleId) {
      yield refactorActionNameForPackage(
        id,
        moduleId,
        actionToBeUpdated?.config.name || "",
        name,
      );

      yield call(fetchModuleEntitiesSaga, {
        payload: { moduleId },
        type: ReduxActionTypes.FETCH_MODULE_ENTITIES_INIT,
      });
    }
  } catch (e) {
    yield put({
      type: ReduxActionErrorTypes.SAVE_ACTION_NAME_ERROR,
      payload: {
        actionId: action.payload.id,
        oldName: actionToBeUpdated?.config.name,
      },
    });
    toast.show(createMessage(ERROR_ACTION_RENAME_FAIL, action.payload.name), {
      kind: "error",
    });
    log.error(e);
  }
}

export function* saveJSObjectNameForPackageSaga(
  action: ReduxAction<{ id: string; name: string }>,
) {
  const { id, name } = action.payload;
  const jsActions: JSCollectionDataState = yield select(getJSCollections);
  const jsActionToBeUpdated: JSCollectionData | undefined = jsActions.find(
    (jsaction) => jsaction.config.id === id,
  );
  const moduleId = jsActionToBeUpdated?.config.moduleId;

  try {
    if (moduleId) {
      yield refactorJSObjectName(
        id,
        moduleId,
        jsActionToBeUpdated?.config.name || "",
        name,
      );

      yield call(fetchModuleEntitiesSaga, {
        payload: { moduleId },
        type: ReduxActionTypes.FETCH_MODULE_ENTITIES_INIT,
      });
    }
  } catch (e) {
    yield put({
      type: ReduxActionErrorTypes.SAVE_JS_COLLECTION_NAME_ERROR,
      payload: {
        actionId: action.payload.id,
        oldName: jsActionToBeUpdated?.config.name,
      },
    });
    toast.show(
      createMessage(ERROR_JS_COLLECTION_RENAME_FAIL, action.payload.name),
      {
        kind: "error",
      },
    );
    log.error(e);
  }
}

export default function* modulesSaga() {
  yield all([
    takeLatest(
      ReduxActionTypes.CREATE_NEW_API_ACTION_FOR_PACKAGE,
      createNewAPIActionForPackageSaga,
    ),
    takeLatest(
      ReduxActionTypes.CREATE_NEW_QUERY_ACTION_FOR_PACKAGE,
      createNewQueryActionForPackageSaga,
    ),
    takeLatest(
      ReduxActionTypes.CREATE_NEW_JS_ACTION_FOR_PACKAGE,
      createNewSActionForPackageSaga,
    ),
    takeLatest(
      ReduxActionTypes.SAVE_ACTION_NAME_FOR_PACKAGE_INIT,
      saveActionNameForPackageSaga,
    ),
    takeLatest(
      ReduxActionTypes.SAVE_JS_OBJECT_NAME_FOR_PACKAGE_INIT,
      saveJSObjectNameForPackageSaga,
    ),
  ]);
}
