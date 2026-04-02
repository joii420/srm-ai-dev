import { createImmerReducer } from "utils/ReducerUtils";
import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import {
  ReduxActionTypes,
  ReduxActionErrorTypes,
} from "@appsmith/constants/ReduxActionConstants";
import {
  createMessage,
  ERROR_MESSAGE_CREATE_PACKAGE,
} from "@appsmith/constants/messages";
import type {
  UpdatePackagePayload,
  CreatePackagePayload,
} from "@appsmith/api/PackageApi";
import type {
  Module,
  ModuleMetadata,
  ModuleEntites,
  Package,
  PackageDetail,
} from "@appsmith/constants/PackageConstants";
import { klona } from "klona";

interface CreatePackageParams extends CreatePackagePayload {
  workspaceId: string;
}

export const initialState: PackagesReduxState = {
  isSavingPackageName: false,
  isErrorSavingPackageName: false,
  isFetchingPackage: true,
  isPublishingPackage: false,
  currentPackage: undefined,
  creatingPackage: {},
  deletingPackage: false,
  importingPackage: false,
  importedPackage: null,
  isImportAppModalOpen: false,
  workspaceIdForImport: null,
};

const handleModuleChange = (
  state: PackagesReduxState,
  action: ReduxAction<Module>,
) => {
  if (state.currentPackage) {
    const newModule = action.payload;
    const index = state.currentPackage.modules.findIndex(
      (m) => m.id === newModule.id,
    );
    state.currentPackage.modules[index] = {
      ...state.currentPackage.modules[index],
      ...newModule,
    };
  }
};

const handleAddModule = (
  state: PackagesReduxState,
  action: ReduxAction<Module>,
) => {
  if (state.currentPackage) {
    const newModule = action.payload;
    state.currentPackage.modules.push(newModule);
  }
};

export const handlers = {
  [ReduxActionTypes.DELETE_PACKAGE_INIT]: (state: PackagesReduxState) => {
    state.deletingPackage = true;
  },
  [ReduxActionTypes.DELETE_PACKAGE_SUCCESS]: (
    state: PackagesReduxState,
    // eslint-disable-next-line
    action: ReduxAction<Package>,
  ) => {
    state.deletingPackage = false;
  },
  [ReduxActionErrorTypes.DELETE_PACKAGE_ERROR]: (state: PackagesReduxState) => {
    state.deletingPackage = false;
  },
  [ReduxActionTypes.FETCH_PACKAGE_INIT]: (state: PackagesReduxState) => {
    state.isFetchingPackage = true;
  },
  [ReduxActionTypes.FETCH_PACKAGE_SUCCESS]: (
    state: PackagesReduxState,
    action: ReduxAction<any>,
  ) => {
    const { modules, modulesMetadata } = action.payload;
    const metaMap = modulesMetadata.reduce((a: any, meta: ModuleMetadata) => {
      a[meta.moduleId] = meta;
      return a;
    }, {});
    const detailModules = modules.map((module: Module) => {
      const metaData = metaMap[module.id];
      return {
        ...module,
        metaData,
      };
    });
    state.currentPackage = {
      ...action.payload,
      modules: detailModules,
    };
    state.isFetchingPackage = false;
  },
  [ReduxActionErrorTypes.FETCH_PACKAGE_ERROR]: (state: PackagesReduxState) => {
    state.isFetchingPackage = false;
  },
  [ReduxActionTypes.CREATE_PACKAGE_INIT]: (
    state: PackagesReduxState,
    action: ReduxAction<CreatePackageParams>,
  ) => {
    state.creatingPackage[action.payload.workspaceId] = true;
  },
  [ReduxActionTypes.CREATE_PACKAGE_SUCCESS]: (
    state: PackagesReduxState,
    action: ReduxAction<{
      workspaceId: string;
      package: Package;
    }>,
  ) => {
    state.creatingPackage[action.payload.workspaceId] = false;
  },
  [ReduxActionErrorTypes.CREATE_PACKAGE_ERROR]: (
    state: PackagesReduxState,
    action: ReduxAction<{ workspaceId: string }>,
  ) => {
    state.creatingPackage[action.payload.workspaceId] = false;
    state.createPackageError = createMessage(ERROR_MESSAGE_CREATE_PACKAGE);
  },
  // [ReduxActionTypes.IMPORT_PACKAGE_INIT]: (state: PackagesReduxState) => ({
  //   ...state,
  //   importingPackage: true,
  // }),
  // [ReduxActionTypes.IMPORT_PACKAGE_SUCCESS]: (
  //   state: PackagesReduxState,
  //   action: ReduxAction<{ importedPackage: any }>,
  // ) => {
  //   const importedPackage = action.payload;
  //   return {
  //     ...state,
  //     importingPackage: false,
  //     importedPackage,
  //   };
  // },
  // [ReduxActionErrorTypes.IMPORT_PACKAGE_ERROR]: (state: PackagesReduxState) => {
  //   return {
  //     ...state,
  //     importingPackage: false,
  //   };
  // },
  [ReduxActionTypes.UPDATE_PACKAGE_INIT]: (
    state: PackagesReduxState,
    action: ReduxAction<UpdatePackagePayload>,
  ) => {
    let isSavingPackageName = false;

    if (action.payload.name) {
      isSavingPackageName = true;
    }

    state.isSavingPackageName = isSavingPackageName;
    state.isErrorSavingPackageName = false;
  },
  [ReduxActionTypes.UPDATE_PACKAGE_SUCCESS]: (
    state: PackagesReduxState,
    // eslint-disable-next-line
    action: ReduxAction<Package>,
  ) => {
    state.isSavingPackageName = false;
    state.isErrorSavingPackageName = false;
    if (state.currentPackage?.packageData) {
      state.currentPackage.packageData = action.payload;
    }
  },
  [ReduxActionErrorTypes.UPDATE_PACKAGE_ERROR]: (state: PackagesReduxState) => {
    state.isSavingPackageName = false;
    state.isErrorSavingPackageName = true;
  },
  [ReduxActionTypes.CREATE_QUERY_MODULE_SUCCESS]: handleAddModule,
  [ReduxActionTypes.CREATE_JS_MODULE_SUCCESS]: handleAddModule,
  [ReduxActionTypes.DELETE_MODULE_SUCCESS]: (
    state: PackagesReduxState,
    action: ReduxAction<Module>,
  ) => {
    if (state.currentPackage) {
      const deletedModule = action.payload;
      state.currentPackage.modules = state.currentPackage.modules.filter(
        (m) => m.id !== deletedModule.id,
      );
    }
  },
  [ReduxActionTypes.UPDATE_MODULE_SUCCESS]: handleModuleChange,
  [ReduxActionTypes.REFACTOR_MODULE_INPUT_NAME_SUCCESS]: handleModuleChange,
  [ReduxActionTypes.REFACTOR_MODULE_NAME_SUCCESS]: handleModuleChange,
  [ReduxActionTypes.FETCH_MODULE_ENTITIES_SUCCESS]: (
    state: PackagesReduxState,
    action: ReduxAction<ModuleEntites>,
  ) => {
    const { actions, jsCollections } = action.payload;
    [...actions, ...jsCollections].forEach((entity) => {
      if (entity.moduleId && entity.isPublic && state.currentPackage) {
        // update module metaData
        const publicAction = entity;
        const metaData: ModuleMetadata = {
          pluginId: publicAction.pluginId,
          pluginType: publicAction.pluginType,
          moduleId: publicAction.moduleId,
          publicEntity: publicAction,
        };
        if (publicAction.datasource?.id) {
          metaData.datasourceId = publicAction.datasource.id;
        }
        const index = state.currentPackage.modules.findIndex(
          (m) => m.id === publicAction.moduleId,
        );
        state.currentPackage.modules[index].metaData = metaData;
      }
    });
  },
  [ReduxActionTypes.RESET_EDITOR_REQUEST]: () => {
    return klona(initialState);
  },
  [ReduxActionTypes.PUBLISH_PACKAGE_INIT]: (state: PackagesReduxState) => {
    state.isPublishingPackage = true;
  },
  [ReduxActionTypes.PUBLISH_PACKAGE_SUCCESS]: (state: PackagesReduxState) => {
    state.isPublishingPackage = false;
  },
  [ReduxActionErrorTypes.PUBLISH_PACKAGE_ERROR]: (
    state: PackagesReduxState,
  ) => {
    state.isPublishingPackage = false;
  },
};

const packagesReducer = createImmerReducer(initialState, handlers);

export type creatingPackageMap = Record<string, boolean>;

export interface PackagesReduxState {
  isSavingPackageName: boolean;
  isErrorSavingPackageName: boolean;
  isFetchingPackage: boolean;
  isPublishingPackage: boolean;
  creatingPackage: creatingPackageMap;
  createPackageError?: string;
  deletingPackage: boolean;
  currentPackage?: PackageDetail;
  importingPackage: boolean;
  importedPackage: unknown;
  isImportAppModalOpen: boolean;
  workspaceIdForImport: any;
}

export default packagesReducer;
