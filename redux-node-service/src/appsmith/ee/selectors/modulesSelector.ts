export * from "ce/selectors/modulesSelector";

import type { AppState } from "@appsmith/reducers";
import type { Module } from "@appsmith/constants/PackageConstants";
import type { ModuleInstanceEntitiesReducerState } from "@appsmith/reducers/entityReducers/moduleInstanceEntitiesReducer";
import type { Action } from "entities/Action";
import { createSelector } from "reselect";
import { countBy } from "lodash";

const DEFAULT_INPUT_EVAL_VALUES = {};

export const getAllModules = (state: AppState) => state.entities.modules;

export const getAllModulesInEdit = (state: AppState) =>
  state.ui.packages.currentPackage?.modules || [];

export const getModuleDetail = (state: AppState, moduleId: string) =>
  state.ui.packages.currentPackage?.modules.find(
    (module: Module) => module.id === moduleId,
  );

export const getModuleById = (
  state: AppState,
  moduleId: string,
): Module | undefined => state.entities.modules[moduleId];

export const getCurrentModuleId = (state: AppState) =>
  state.ui.module.currentModuleId || "";

export const getCurrentModule = createSelector(
  getAllModulesInEdit,
  getCurrentModuleId,
  (modules, moduleId): Module | undefined =>
    modules.find((m) => m.id === moduleId),
);

export const isFetchingModuleEntities = (state: AppState) =>
  state.ui.module.isFetchingModuleEntities;

export const getModuleInputsEvalValues = (state: AppState) =>
  state.evaluations.tree?.inputs || DEFAULT_INPUT_EVAL_VALUES;

export const getModuleActions = (state: AppState) => state.entities.actions;

export const getModuleJSCollections = (state: AppState) =>
  state.entities.jsActions;

export const getModuleInstanceActions = (
  state: AppState,
): ModuleInstanceEntitiesReducerState["actions"] =>
  state.entities.moduleInstanceEntities.actions;

export const getModuleInstanceJSCollections = (
  state: AppState,
): ModuleInstanceEntitiesReducerState["jsCollections"] =>
  state.entities.moduleInstanceEntities.jsCollections;

export const getRefactorInputState = (state: AppState) =>
  state.ui.module.refactorInputSavingState;

export const getModulePublicAction = (
  state: AppState,
  moduleId: string,
): Action | undefined => {
  const action = state.entities.actions.find(
    (action) => action.config.moduleId === moduleId && action.config.isPublic,
  );
  return action ? action.config : undefined;
};

export const getModulePublicJSCollection = (
  state: AppState,
  moduleId: string,
) => {
  const action = state.entities.jsActions.find(
    (action) => action.config.moduleId === moduleId && action.config.isPublic,
  );

  return action ? action.config : undefined;
};

export const getDatasources = (state: AppState) => {
  return state.entities.datasources.list;
};

export const getModuleDSUsage = createSelector(
  getAllModulesInEdit,
  getDatasources,
  (state: AppState, editorType: string) => editorType,
  (modules, datasources, editorType) => {
    const actionCount = countBy(modules, "datasourceId");
    const actionDsMap: Record<string, string> = {};

    datasources.forEach((ds) => {
      actionDsMap[ds.id] = `No modules in this ${editorType}`;
    });
    Object.keys(actionCount).forEach((dsId) => {
      actionDsMap[dsId] = `${actionCount[dsId]} modules in this ${editorType}`;
    });

    return actionDsMap;
  },
);

export const getIsModuleSaving = (state: AppState) => {
  return state.ui.module.isModuleUpdating;
};
