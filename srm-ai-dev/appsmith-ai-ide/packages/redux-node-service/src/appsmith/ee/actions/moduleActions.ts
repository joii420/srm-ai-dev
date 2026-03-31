import type { MODULE_TYPE } from "@appsmith/constants/ModuleConstants";
import {
  type ReduxAction,
  ReduxActionTypes,
} from "@appsmith/constants/ReduxActionConstants";
type EventLocation = any;

export interface CreateQueryModulePayload {
  datasourceId?: string;
  type: MODULE_TYPE;
  from: any;
  packageId: string;
  apiType?: string;
}
export interface CreateJSModulePayload {
  from: string;
  packageId: string;
}
export interface DeleteModulePayload {
  moduleId: string;
  onSuccess?: () => void;
}

export interface AddModuleReferencesByNamePayload {
  names: string[];
}

export interface RemoveModuleReferencesByNamePayload {
  names: string[];
}

export const addModuleReferencesByName = (
  payload: AddModuleReferencesByNamePayload,
) => {
  return {
    type: ReduxActionTypes.ADD_MODULE_REFERENCE_BY_NAME_INIT,
    payload,
  };
};

export const removeModuleReferencesByName = (
  payload: RemoveModuleReferencesByNamePayload,
) => {
  return {
    type: ReduxActionTypes.REMOVE_MODULE_REFERENCE_BY_NAME_INIT,
    payload,
  };
};

export const createQueryModule = (payload: CreateQueryModulePayload) => ({
  type: ReduxActionTypes.CREATE_QUERY_MODULE_INIT,
  payload,
});

export const createJSModule = (payload: CreateJSModulePayload) => ({
  type: ReduxActionTypes.CREATE_JS_MODULE_INIT,
  payload,
});

export const deleteModule = (payload: DeleteModulePayload) => {
  return {
    type: ReduxActionTypes.DELETE_MODULE_INIT,
    payload,
  };
};

export const createNewQueryActionForPackage = (
  moduleId: string,
  from: EventLocation,
  datasourceId: string,
) => {
  return {
    type: ReduxActionTypes.CREATE_NEW_QUERY_ACTION_FOR_PACKAGE,
    payload: {
      moduleId,
      from,
      datasourceId,
    },
  };
};

export const createNewAPIActionForPackage = (
  moduleId: string,
  from: EventLocation,
  apiType?: string,
) => {
  return {
    type: ReduxActionTypes.CREATE_NEW_API_ACTION_FOR_PACKAGE,
    payload: {
      moduleId,
      from,
      apiType,
    },
  };
};

export const createNewJSCollectionForPackage = (
  moduleId: string,
  from: EventLocation,
): ReduxAction<{ moduleId: string; from: EventLocation }> => ({
  type: ReduxActionTypes.CREATE_NEW_JS_ACTION_FOR_PACKAGE,
  payload: { moduleId, from: from },
});

export const saveActionNameForPackage = (payload: {
  id: string;
  name: string;
}) => ({
  type: ReduxActionTypes.SAVE_ACTION_NAME_FOR_PACKAGE_INIT,
  payload,
});

export const saveJSObjectNameForPackage = (payload: {
  id: string;
  name: string;
}) => ({
  type: ReduxActionTypes.SAVE_JS_OBJECT_NAME_FOR_PACKAGE_INIT,
  payload,
});
