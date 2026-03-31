export * from "ce/entities/Engine/actionHelpers";
import { fetchConsumablePackagesInWorkspace } from "@appsmith/actions/packageActions";
import {
  ReduxActionErrorTypes,
  ReduxActionTypes,
} from "@appsmith/constants/ReduxActionConstants";
import type { DependentFeatureFlags } from "@appsmith/selectors/engineSelectors";
import {
  getPageDependencyActions as CE_getPageDependencyActions,
  ActionParentEntityType as CE_ActionParentEntityType,
  CreateNewActionKey as CE_CreateNewActionKey,
} from "ce/entities/Engine/actionHelpers";
import type { EditConsolidatedApi } from "sagas/InitSagas";

export const CreateNewActionKey = {
  ...CE_CreateNewActionKey,
  MODULE: "moduleId",
} as const;

export type CreateNewActionKeyInterface =
  (typeof CreateNewActionKey)[keyof typeof CreateNewActionKey];

export const ActionParentEntityType = {
  ...CE_ActionParentEntityType,
  MODULE: "MODULE",
} as const;

export type ActionParentEntityTypeInterface =
  (typeof ActionParentEntityType)[keyof typeof ActionParentEntityType];

export const getPageDependencyActions = (
  currentWorkspaceId: string = "",
  featureFlags: DependentFeatureFlags = {},
  allResponses: EditConsolidatedApi,
) => {
  const CE = CE_getPageDependencyActions(
    currentWorkspaceId,
    featureFlags,
    allResponses,
  );
  const initActions = [
    ...CE.initActions,
    // TODO: 【临时修改】不加载packages
    // fetchConsumablePackagesInWorkspace({
    //   workspaceId: currentWorkspaceId,
    // }),
  ];

  const successActions = [
    ...CE.successActions,
    // ReduxActionTypes.FETCH_CONSUMABLE_PACKAGES_IN_WORKSPACE_SUCCESS,
  ];

  const errorActions = [
    ...CE.errorActions,
    // ReduxActionErrorTypes.FETCH_CONSUMABLE_PACKAGES_IN_WORKSPACE_ERROR,
  ];

  return {
    initActions,
    successActions,
    errorActions,
  };
};
