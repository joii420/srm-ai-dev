export * from "ce/sagas/ApiCallerSagas";
import { call } from "redux-saga/effects";
import { ActionParentEntityType } from "@appsmith/entities/Engine/actionHelpers";
import {
  updateActionAPICall as updateActionAPICallCE,
  updateJSCollectionAPICall as CE_updateJSCollectionAPICall,
} from "ce/sagas/ApiCallerSagas";
import type { Action } from "entities/Action";
import { omit } from "lodash";
import PackageApi from "@appsmith/api/PackageApi";
import type { ApiResponse } from "api/ApiResponses";
import type { JSCollection } from "entities/JSCollection";
import ModuleApi from "@appsmith/api/ModuleApi";
import { ENTITY_TYPE } from "entities/DataTree/dataTreeFactory";

export function* updateActionAPICall(action: Action) {
  try {
    if (action.contextType === ActionParentEntityType.MODULE) {
      const moduleAction = omit(action, "inputsForm") as Action;
      const response: ApiResponse<Action> =
        yield PackageApi.updateModuleAction(moduleAction);
      return response;
    }

    return yield* updateActionAPICallCE(action);
  } catch (e) {
    throw e;
  }
}

export function* updateJSCollectionAPICall(jsCollection: JSCollection) {
  try {
    if (jsCollection.pageId || jsCollection.workflowId) {
      const response: ApiResponse<JSCollection> = yield call(
        CE_updateJSCollectionAPICall,
        jsCollection,
      );

      return response;
    } else {
      const response: ApiResponse<JSCollection> =
        yield ModuleApi.updateJSCollection({
          ...jsCollection,
          type: ENTITY_TYPE.JSACTION,
        } as unknown as JSCollection);

      return response;
    }
  } catch (e) {
    throw e;
  }
}
