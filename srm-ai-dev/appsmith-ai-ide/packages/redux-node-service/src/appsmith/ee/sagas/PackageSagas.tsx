import {
  ReduxActionTypes,
  ReduxActionErrorTypes,
} from "@appsmith/constants/ReduxActionConstants";
import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import { all, takeLatest, put, select, call } from "redux-saga/effects";
import { getCurrentWorkspaceId } from "@appsmith/selectors/selectedWorkspaceSelectors";
import PackageApi from "@appsmith/api/PackageApi";
import type { Package } from "@appsmith/constants/PackageConstants";
import type {
  CreatePackagePayload,
  UpdatePackagePayload,
  FetchPackagesResponse,
  ChangePackageResponse,
  FetchPackageResponse,
  PublishPackagePayload,
  PublishPackageResponse,
} from "@appsmith/api/PackageApi";
import { validateResponse } from "sagas/ErrorSagas";
import { toast, type IconNames } from "../../stubs/toast";
import type { AppColorCode } from "constants/DefaultTheme";
import { getPackagesOfWorkspace } from "@appsmith/selectors/packageSelectors";
import history from "utils/history";
import { PACKAGE_BASE_PATH } from "@appsmith/constants/routes/appRoutes";
import { failFastApiCalls } from "sagas/InitSagas";
import {
  fetchDatasources,
  fetchMockDatasources,
} from "actions/datasourceActions";
import { fetchPlugins } from "actions/pluginActions";
import { fetchPluginFormConfigs } from "actions/pluginActions";
import CodemirrorTernService from "utils/autocomplete/CodemirrorTernService";
import {
  createMessage,
  FETCH_PACKAGES_ERROR,
} from "@appsmith/constants/messages";
import type { ApiResponse } from "api/ApiResponses";
import { setExplorerActiveAction } from "actions/explorerActions";

export function* fetchAllPackagesOfWorkspaceSaga(action?: ReduxAction<string>) {
  let activeWorkspaceId: string = "";
  if (!action?.payload) {
    activeWorkspaceId = yield select(getCurrentWorkspaceId);
  } else {
    activeWorkspaceId = action.payload;
  }

  try {
    const response: FetchPackagesResponse = yield call(
      PackageApi.fetchPackages,
      activeWorkspaceId,
    );
    const isValidResponse: boolean = yield validateResponse(response);
    if (isValidResponse) {
      yield put({
        type: ReduxActionTypes.FETCH_ALL_PACKAGES_IN_WORKSPACE_SUCCESS,
        payload: response.data,
      });
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.FETCH_ALL_PACKAGES_IN_WORKSPACE_ERROR,
      payload: {
        error,
      },
    });
  }
}

export function* updatePackageSaga(action: ReduxAction<UpdatePackagePayload>) {
  try {
    const request: UpdatePackagePayload = action.payload;
    const response: ChangePackageResponse = yield call(
      PackageApi.updatePackage,
      request,
    );
    const isValidResponse: boolean = yield validateResponse(response);
    if (isValidResponse) {
      yield put({
        type: ReduxActionTypes.UPDATE_PACKAGE_SUCCESS,
        payload: response.data,
      });
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.UPDATE_PACKAGE_ERROR,
      payload: {
        error,
      },
    });
  }
}

export function* deletePackageSaga(action: ReduxAction<{ id: string }>) {
  try {
    const response: ChangePackageResponse = yield call(
      PackageApi.deletePackage,
      action.payload.id,
    );
    const isValidResponse: boolean = yield validateResponse(response);
    if (isValidResponse) {
      yield put({
        type: ReduxActionTypes.DELETE_PACKAGE_SUCCESS,
        payload: response.data,
      });
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.DELETE_PACKAGE_ERROR,
      payload: {
        error,
      },
    });
  }
}

export function* createPackageSaga(
  action: ReduxAction<{
    name: string;
    icon: IconNames;
    color: AppColorCode;
    workspaceId: string;
    resolve: any;
    reject: any;
  }>,
) {
  const { name, color, icon, reject, workspaceId } = action.payload;
  try {
    const packages: Package[] = yield select(getPackagesOfWorkspace);
    const existingPackage = packages
      ? packages.find((pkg) => pkg.name === name)
      : null;
    if (existingPackage) {
      yield call(reject, {
        _error: "An package with this name already exists",
      });
      yield put({
        type: ReduxActionErrorTypes.CREATE_PACKAGE_ERROR,
        payload: {
          error: "Could not create package",
          show: false,
        },
      });
    } else {
      const request: CreatePackagePayload = {
        name,
        icon,
        color,
      };
      const response: ChangePackageResponse = yield call(
        PackageApi.createPackage,
        workspaceId,
        request,
      );
      const isValidResponse: boolean = yield validateResponse(response);
      if (isValidResponse) {
        yield put({
          type: ReduxActionTypes.CREATE_PACKAGE_SUCCESS,
          payload: {
            workspaceId,
            package: response.data,
          },
        });

        history.push(`${PACKAGE_BASE_PATH}/${response.data.id}`);
      }
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.CREATE_PACKAGE_ERROR,
      payload: {
        error,
        show: false,
        workspaceId,
      },
    });
  }
}

export function* fetchPackageSaga(action: ReduxAction<{ id: string }>) {
  // setup evaluation engine
  yield put({ type: ReduxActionTypes.START_EVALUATION });
  CodemirrorTernService.resetServer();
  yield put(setExplorerActiveAction(true));
  try {
    const response: FetchPackageResponse = yield call(
      PackageApi.fetchPackage,
      action.payload.id,
    );
    const isValidResponse: boolean = yield validateResponse(response);
    if (isValidResponse) {
      // update workspace id
      const { workspaceId } = response.data.packageData;
      yield put({
        type: ReduxActionTypes.SET_CURRENT_WORKSPACE_ID,
        payload: {
          workspaceId,
        },
      });
      // init datasource
      const pluginsAndDatasourcesCalls: boolean = yield failFastApiCalls(
        [
          fetchPlugins({ workspaceId }),
          fetchDatasources({ workspaceId }),
          fetchMockDatasources(),
        ],
        [
          ReduxActionTypes.FETCH_PLUGINS_SUCCESS,
          ReduxActionTypes.FETCH_DATASOURCES_SUCCESS,
          ReduxActionTypes.FETCH_MOCK_DATASOURCES_SUCCESS,
        ],
        [
          ReduxActionErrorTypes.FETCH_PLUGINS_ERROR,
          ReduxActionErrorTypes.FETCH_DATASOURCES_ERROR,
          ReduxActionErrorTypes.FETCH_MOCK_DATASOURCES_ERROR,
        ],
      );
      if (!pluginsAndDatasourcesCalls) return;
      const pluginFormCall: boolean = yield failFastApiCalls(
        [fetchPluginFormConfigs()],
        [ReduxActionTypes.FETCH_PLUGIN_FORM_CONFIGS_SUCCESS],
        [ReduxActionErrorTypes.FETCH_PLUGIN_FORM_CONFIGS_ERROR],
      );
      if (!pluginFormCall) return;
      // loading completed
      yield put({
        type: ReduxActionTypes.FETCH_PACKAGE_SUCCESS,
        payload: response.data,
      });
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.FETCH_PACKAGE_ERROR,
      payload: {
        error,
      },
    });
  }
}

export function* publishPackageSaga(
  action: ReduxAction<PublishPackagePayload>,
) {
  try {
    const response: PublishPackageResponse = yield call(
      PackageApi.publishPackage,
      action.payload,
    );
    const isValidResponse: boolean = yield validateResponse(response);

    if (isValidResponse) {
      yield put({
        type: ReduxActionTypes.PUBLISH_PACKAGE_SUCCESS,
        payload: response.data,
      });

      toast.show("Package published successfully", { kind: "success" });

      return response.data;
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.PUBLISH_PACKAGE_ERROR,
      payload: {
        error,
      },
    });
  }
}

export function* fetchConsumablePackagesInWorkspaceSaga(
  action: ReduxAction<{ workspaceId: string }>,
) {
  try {
    const response: ApiResponse = yield call(
      PackageApi.fetchConsumablePackagesInWorkspace,
      action.payload,
    );
    const isValidResponse: boolean = yield validateResponse(response);

    if (isValidResponse) {
      yield put({
        type: ReduxActionTypes.FETCH_CONSUMABLE_PACKAGES_IN_WORKSPACE_SUCCESS,
        payload: response.data,
      });
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.FETCH_CONSUMABLE_PACKAGES_IN_WORKSPACE_ERROR,
      payload: { error: { message: createMessage(FETCH_PACKAGES_ERROR) } },
    });
  }
}

export default function* packageSagas() {
  yield all([
    takeLatest(ReduxActionTypes.PUBLISH_PACKAGE_INIT, publishPackageSaga),
    takeLatest(ReduxActionTypes.UPDATE_PACKAGE_INIT, updatePackageSaga),
    takeLatest(
      ReduxActionTypes.FETCH_ALL_PACKAGES_IN_WORKSPACE_INIT,
      fetchAllPackagesOfWorkspaceSaga,
    ),
    takeLatest(ReduxActionTypes.FETCH_PACKAGE_INIT, fetchPackageSaga),
    takeLatest(ReduxActionTypes.CREATE_PACKAGE_INIT, createPackageSaga),
    takeLatest(ReduxActionTypes.DELETE_PACKAGE_INIT, deletePackageSaga),
    // takeLatest(ReduxActionTypes.IMPORT_PACKAGE_INIT, importPackageSaga),
    takeLatest(
      ReduxActionTypes.FETCH_CONSUMABLE_PACKAGES_IN_WORKSPACE_INIT,
      fetchConsumablePackagesInWorkspaceSaga,
    ),
  ]);
}
