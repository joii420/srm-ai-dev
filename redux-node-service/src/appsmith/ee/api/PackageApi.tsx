import API from "api/Api";
import type { AxiosPromise } from "axios";
import type { ApiResponse } from "api/ApiResponses";
import type {
  Package,
  PackageDetail,
  ModuleType,
  ModuleEntites,
  Module,
  ModuleMetadata,
} from "@appsmith/constants/PackageConstants";
import type { Action } from "entities/Action";

export interface CreatePackagePayload {
  name?: string;
  icon?: string;
  color?: string;
}

export interface UpdatePackagePayload extends CreatePackagePayload {
  id: string;
}

export interface CreateModulePayload {
  name: string;
  packageId: string;
  type: ModuleType;
  entity: any;
  inputsForm?: any[];
}

export interface PublishPackagePayload {
  packageId: string;
}

export interface FetchPackagesResponse extends ApiResponse {
  data: Array<Package>;
}

export interface ChangePackageResponse extends ApiResponse {
  data: Package;
}

export interface FetchPackageResponse extends ApiResponse {
  data: PackageDetail;
}

export interface CreateModuleResponse extends ApiResponse {
  data: Module;
}

export type ModuleEntitiesResponse = ApiResponse<ModuleEntites>;

export interface ModuleRefactorNamePayload {
  moduleId: string;
  newName: string;
  oldName: string;
}

export interface InputRefactorNamePayload extends ModuleRefactorNamePayload {
  inputId: string;
  formName?: string;
}

export type PublishPackageResponse = ApiResponse<PublishPackagePayload>;

export interface FetchConsumablePackagesInWorkspaceResponse {
  packages: Package[];
  modules: Module[];
  moduleMetadata: ModuleMetadata[];
}

class PackageApi extends API {
  static url = "v1/packages";
  static moduleUrl = "/v1/modules";

  static async fetchPackages(
    workspaceId: string,
  ): Promise<AxiosPromise<ApiResponse<Package[]>>> {
    return API.get(PackageApi.url, { workspaceId });
  }

  static async createPackage(
    workspaceId: string,
    payload: CreatePackagePayload,
  ): Promise<AxiosPromise<ApiResponse<Package>>> {
    return API.post(PackageApi.url, payload, { workspaceId });
  }

  static async updatePackage(
    payload: UpdatePackagePayload,
  ): Promise<AxiosPromise<ApiResponse<Package>>> {
    return API.put(`${PackageApi.url}/${payload.id}`, payload);
  }

  static async deletePackage(id: string) {
    return API.delete(`${PackageApi.url}/${id}`);
  }

  static async fetchPackage(
    id: string,
  ): Promise<AxiosPromise<ApiResponse<PackageDetail>>> {
    return API.get(`${PackageApi.url}/${id}`);
  }

  static async publishPackage(
    payload: PublishPackagePayload,
  ): Promise<AxiosPromise<ApiResponse>> {
    const { packageId } = payload;
    const url = `${PackageApi.url}/${packageId}/publish`;

    return API.post(url);
  }

  static async fetchConsumablePackagesInWorkspace(payload: {
    workspaceId: string;
  }): Promise<
    AxiosPromise<ApiResponse<FetchConsumablePackagesInWorkspaceResponse>>
  > {
    const url = `${PackageApi.url}/consumables?workspaceId=${payload.workspaceId}`;

    return API.get(url);
  }

  static async createModule(
    payload: CreatePackagePayload,
  ): Promise<AxiosPromise<CreateModuleResponse>> {
    return API.post(PackageApi.moduleUrl, payload);
  }

  static async deleteModule(id: string) {
    return API.delete(`${PackageApi.moduleUrl}/${id}`);
  }

  static async fetchModuleEntities(
    id: string,
  ): Promise<AxiosPromise<ModuleEntitiesResponse>> {
    return API.get(`${PackageApi.moduleUrl}/${id}/entities`);
  }

  static async updateModule(
    payload: Module,
  ): Promise<AxiosPromise<ApiResponse<Module>>> {
    return API.put(`${PackageApi.moduleUrl}/${payload.id}`, payload);
  }

  static async updateModuleAction(
    payload: Action,
  ): Promise<AxiosPromise<ApiResponse<Action>>> {
    return API.put(
      `${PackageApi.moduleUrl}/${payload.moduleId}/actions/${payload.id}`,
      payload,
    );
  }

  static async refactorModuleName(
    payload: ModuleRefactorNamePayload,
  ): Promise<AxiosPromise<ApiResponse<Module>>> {
    return API.put(`${PackageApi.moduleUrl}/refactor`, payload);
  }

  static async refactorModuleInputName(
    payload: InputRefactorNamePayload,
  ): Promise<AxiosPromise<ApiResponse<Module>>> {
    return API.put(`${PackageApi.moduleUrl}/refactor/input`, payload);
  }
}

export default PackageApi;
