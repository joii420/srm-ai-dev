import { createImmerReducer } from "utils/ReducerUtils";
import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import {
  ReduxActionTypes,
  ReduxActionErrorTypes,
} from "@appsmith/constants/ReduxActionConstants";
import type {
  Module,
  ModuleEntites,
} from "@appsmith/constants/PackageConstants";
import { klona } from "klona";

export const initialState: ModuleReduxState = {
  isFetchingModuleEntities: false,
  deletingModule: false,
  currentModuleId: "",
  isModuleUpdating: false,
  refactorInputSavingState: {
    isSaving: false,
    error: false,
  },
};

export const handlers = {
  [ReduxActionTypes.DELETE_MODULE_INIT]: (state: ModuleReduxState) => {
    state.deletingModule = true;
    state.isModuleUpdating = true;
  },
  [ReduxActionTypes.DELETE_MODULE_SUCCESS]: (
    state: ModuleReduxState,
    // eslint-disable-next-line
    action: ReduxAction<Module>,
  ) => {
    state.deletingModule = false;
    state.isModuleUpdating = false;
  },
  [ReduxActionErrorTypes.DELETE_MODULE_ERROR]: (state: ModuleReduxState) => {
    state.deletingModule = false;
    state.isModuleUpdating = false;
  },
  [ReduxActionTypes.FETCH_MODULE_ENTITIES_INIT]: (state: ModuleReduxState) => {
    state.isFetchingModuleEntities = true;
  },
  [ReduxActionTypes.FETCH_MODULE_ENTITIES_SUCCESS]: (
    state: ModuleReduxState,
    // eslint-disable-next-line
    action: ReduxAction<ModuleEntites>,
  ) => {
    state.isFetchingModuleEntities = false;
  },
  [ReduxActionErrorTypes.FETCH_MODULE_ENTITIES_ERROR]: (
    state: ModuleReduxState,
  ) => {
    state.isFetchingModuleEntities = false;
  },
  [ReduxActionTypes.SET_CURRENT_MODULE_ID]: (
    state: ModuleReduxState,
    action: ReduxAction<{ id: string }>,
  ) => {
    state.currentModuleId = action.payload.id;
  },
  [ReduxActionTypes.REFACTOR_MODULE_INPUT_NAME_INIT]: (
    state: ModuleReduxState,
  ) => {
    state.refactorInputSavingState.isSaving = true;
    state.refactorInputSavingState.error = false;
    state.isModuleUpdating = true;
  },
  [ReduxActionTypes.REFACTOR_MODULE_INPUT_NAME_SUCCESS]: (
    state: ModuleReduxState,
  ) => {
    state.refactorInputSavingState.isSaving = false;
    state.refactorInputSavingState.error = false;
    state.isModuleUpdating = false;
  },
  [ReduxActionErrorTypes.REFACTOR_MODULE_INPUT_NAME_ERROR]: (
    state: ModuleReduxState,
  ) => {
    state.refactorInputSavingState.isSaving = false;
    state.refactorInputSavingState.error = true;
    state.isModuleUpdating = false;
  },
  [ReduxActionTypes.UPDATE_MODULE_INIT]: (state: ModuleReduxState) => {
    state.isModuleUpdating = true;
  },
  [ReduxActionTypes.UPDATE_MODULE_SUCCESS]: (state: ModuleReduxState) => {
    state.isModuleUpdating = false;
  },
  [ReduxActionErrorTypes.UPDATE_MODULE_ERROR]: (state: ModuleReduxState) => {
    state.isModuleUpdating = false;
  },
  [ReduxActionTypes.REFACTOR_MODULE_NAME_INIT]: (state: ModuleReduxState) => {
    state.isModuleUpdating = true;
  },
  [ReduxActionTypes.REFACTOR_MODULE_NAME_SUCCESS]: (
    state: ModuleReduxState,
  ) => {
    state.isModuleUpdating = false;
  },
  [ReduxActionErrorTypes.REFACTOR_MODULE_NAME_ERROR]: (
    state: ModuleReduxState,
  ) => {
    state.isModuleUpdating = false;
  },
  [ReduxActionTypes.RESET_EDITOR_REQUEST]: () => {
    return klona(initialState);
  },
};

const moduleReducer = createImmerReducer(initialState, handlers);

export interface ModuleReduxState {
  isFetchingModuleEntities: boolean;
  deletingModule: boolean;
  currentModuleId: string;
  isModuleUpdating: boolean;
  refactorInputSavingState: {
    isSaving: boolean;
    error: boolean;
  };
}

export default moduleReducer;
