import { createImmerReducer } from "utils/ReducerUtils";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import type { Module } from "@appsmith/constants/ModuleConstants";
import type { FetchConsumablePackagesInWorkspaceResponse } from "@appsmith/api/PackageApi";
import { klona } from "klona";

type ID = string;

export type ModulesReducerState = Record<ID, Module>;

export const initialState: ModulesReducerState = {};

const modulesReducer = createImmerReducer(initialState, {
  [ReduxActionTypes.FETCH_CONSUMABLE_PACKAGES_IN_WORKSPACE_SUCCESS]: (
    draftState: ModulesReducerState,
    action: ReduxAction<FetchConsumablePackagesInWorkspaceResponse>,
  ) => {
    draftState = klona(initialState);
    const { moduleMetadata, modules } = action.payload;

    modules.forEach((module: any) => {
      const metadata = moduleMetadata.filter(
        (data) => data.moduleId === module.id,
      )[0];

      draftState[module.id] = {
        ...module,
        ...metadata,
      };
    });
    return draftState;
  },

  [ReduxActionTypes.RESET_EDITOR_REQUEST]: () => {
    return klona(initialState);
  },
});

export default modulesReducer;
