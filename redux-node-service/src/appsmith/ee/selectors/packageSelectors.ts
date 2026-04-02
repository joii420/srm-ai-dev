export * from "ce/selectors/packageSelectors";

import type { PackageMetadata } from "@appsmith/constants/PackageConstants";
import type { AppState } from "@appsmith/reducers";
import {
  ENTITY_EXPLORER_RENDER_ORDER,
  MODULE_TYPE,
} from "@appsmith/constants/ModuleConstants";
import type { Module, Package } from "@appsmith/constants/PackageConstants";

export const getIsFetchingPackages = (state: AppState) =>
  state.ui.selectedWorkspace.loadingStates.isFetchingPackages;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getIsCreatingPackage = (state: AppState, workspaceId: string) =>
  !!state.ui.packages.creatingPackage[workspaceId];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getPackagesList = (state: AppState): PackageMetadata[] =>
  state.ui.selectedWorkspace.packages;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getPackagesOfWorkspace = (state: AppState) =>
  state.ui.selectedWorkspace.packages;

export const getIsSavingPackageName = (state: AppState) =>
  state.ui.packages.isSavingPackageName;

export const getIsErroredSavingPackageName = (state: AppState) =>
  state.ui.packages.isErrorSavingPackageName;

export const getIsPublishingPackage = (state: AppState) =>
  state.ui.packages.isPublishingPackage;

export const getIsFetchingPackageDetail = (state: AppState) =>
  state.ui.packages.isFetchingPackage;

export const getCurrentPackage = (state: AppState) =>
  state.ui.packages.currentPackage?.packageData;

export const getCurrentPackageId = (state: AppState) =>
  state.ui.packages.currentPackage?.packageData?.id;

export const getCurrentPackageModules = (state: AppState) =>
  state.ui.packages.currentPackage?.modules;

export const getFirstModule = (state: AppState) => {
  const modules = getCurrentPackageModules(state) || [];
  const firstModuleOfEachType: Record<MODULE_TYPE, Module | undefined> = {
    [MODULE_TYPE.UI]: undefined,
    [MODULE_TYPE.QUERY]: undefined,
    [MODULE_TYPE.JS]: undefined,
  };

  modules.forEach((module) => {
    if (!firstModuleOfEachType[module.type]) {
      firstModuleOfEachType[module.type] = module;
    }
  });

  return ENTITY_EXPLORER_RENDER_ORDER.reduce(
    (acc: Module | undefined, next) => {
      acc = acc || firstModuleOfEachType[next];

      return acc;
    },
    undefined,
  );
};

export const getModulesMetadata = (state: AppState) =>
  state.ui.explorer.modulesMetadata;

export const getModulesMetadataById = (state: AppState, id: string) =>
  state.ui.explorer.modulesMetadata[id];

export const getPackageById = (
  state: AppState,
  id: string,
): Package | undefined => state.entities.packages[id];

export const getPackages = (state: AppState) => state.entities.packages;
