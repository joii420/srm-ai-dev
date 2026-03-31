export * from "ce/reducers/uiReducers/selectedWorkspaceReducer";
import {
  handlers as CE_handlers,
  initialState,
  SelectedWorkspaceReduxState,
} from "ce/reducers/uiReducers/selectedWorkspaceReducer";
import { createImmerReducer } from "utils/ReducerUtils";
import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import {
  ReduxActionErrorTypes,
  ReduxActionTypes,
} from "@appsmith/constants/ReduxActionConstants";
import type { Package } from "@appsmith/constants/PackageConstants";

const handlers = {
  ...CE_handlers,
  [ReduxActionTypes.FETCH_ALL_PACKAGES_IN_WORKSPACE_INIT]: (
    draftState: SelectedWorkspaceReduxState,
  ) => {
    draftState.loadingStates.isFetchingPackages = true;
  },
  [ReduxActionTypes.FETCH_ALL_PACKAGES_IN_WORKSPACE_SUCCESS]: (
    draftState: SelectedWorkspaceReduxState,
    action: ReduxAction<Package[]>,
  ) => {
    draftState.loadingStates.isFetchingPackages = false;
    draftState.packages = action.payload;
  },
  [ReduxActionErrorTypes.FETCH_ALL_PACKAGES_IN_WORKSPACE_ERROR]: (
    draftState: SelectedWorkspaceReduxState,
  ) => {
    draftState.loadingStates.isFetchingPackages = false;
  },
  [ReduxActionTypes.DELETE_PACKAGE_SUCCESS]: (
    draftState: SelectedWorkspaceReduxState,
    action: ReduxAction<Package>,
  ) => {
    const packages = draftState.packages.filter(
      (pkg: Package) => pkg.id !== action.payload.id,
    );
    draftState.packages = [...packages];
  },
  [ReduxActionTypes.CREATE_PACKAGE_SUCCESS]: (
    draftState: SelectedWorkspaceReduxState,
    action: ReduxAction<{
      workspaceId: string;
      package: Package;
    }>,
  ) => {
    const packages = draftState.packages;
    packages.push(action.payload.package);
    draftState.packages = [...packages];
  },
  [ReduxActionTypes.UPDATE_PACKAGE_SUCCESS]: (
    draftState: SelectedWorkspaceReduxState,
    action: ReduxAction<Package>,
  ) => {
    const { id, ...rest } = action.payload;
    const packages = draftState.packages;

    const pkgIndex = draftState.packages.findIndex((pkg) => pkg.id === id);
    if (pkgIndex !== -1) {
      packages[pkgIndex] = {
        ...packages[pkgIndex],
        ...rest,
      };
    }
    draftState.packages = [...packages];
  },
};

const selectedWorkspaceReducer = createImmerReducer(initialState, handlers);

export default selectedWorkspaceReducer;
