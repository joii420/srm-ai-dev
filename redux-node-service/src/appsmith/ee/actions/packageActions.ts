import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";

export interface FetchConsumablePackagesInWorkspacePayload {
  workspaceId: string;
}

export const fetchAllPackagesOfWorkspace = (payload?: string) => {
  return {
    type: ReduxActionTypes.FETCH_ALL_PACKAGES_IN_WORKSPACE_INIT,
    payload,
  };
};

export const fetchConsumablePackagesInWorkspace = (
  payload: FetchConsumablePackagesInWorkspacePayload,
) => {
  return {
    type: ReduxActionTypes.FETCH_CONSUMABLE_PACKAGES_IN_WORKSPACE_INIT,
    payload,
  };
};
