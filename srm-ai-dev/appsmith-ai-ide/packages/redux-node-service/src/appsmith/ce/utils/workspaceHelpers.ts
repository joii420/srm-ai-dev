import { fetchAllApplicationsOfWorkspace } from "@appsmith/actions/applicationActions";
import { fetchAllPackagesOfWorkspace } from "@appsmith/actions/packageActions";
import { fetchUsersForWorkspace } from "@appsmith/actions/workspaceActions";
import {
  ReduxActionErrorTypes,
  ReduxActionTypes,
} from "@appsmith/constants/ReduxActionConstants";

export const getWorkspaceEntitiesActions = (workspaceId: string = "") => {
  const initActions = [
    fetchAllApplicationsOfWorkspace(workspaceId),
    fetchUsersForWorkspace(workspaceId),
    fetchAllPackagesOfWorkspace(workspaceId),
  ];

  const successActions = [
    ReduxActionTypes.FETCH_ALL_APPLICATIONS_OF_WORKSPACE_SUCCESS,
    ReduxActionTypes.FETCH_ALL_USERS_SUCCESS,
    ReduxActionTypes.FETCH_ALL_PACKAGES_IN_WORKSPACE_SUCCESS,
  ];

  const errorActions = [
    ReduxActionErrorTypes.FETCH_ALL_APPLICATIONS_OF_WORKSPACE_ERROR,
    ReduxActionErrorTypes.FETCH_ALL_USERS_ERROR,
    ReduxActionErrorTypes.FETCH_ALL_PACKAGES_IN_WORKSPACE_ERROR,
  ];

  return {
    initActions,
    successActions,
    errorActions,
  };
};
