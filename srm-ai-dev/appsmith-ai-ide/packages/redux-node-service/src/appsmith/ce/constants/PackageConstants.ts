import type { PluginType } from "entities/Action";

type ID = string;

export interface Package {
  id: ID;
  name: string; // Name of the package.
  icon: string;
  color: string;
  workspaceId: ID; // ID of the workspace where the package is created.
  description?: string; // Description that will show up in package installation section.
  modifiedBy: string;
  modifiedAt: string;
  userPermissions: string[];
}

export type PackageMetadata = Package;

export enum ModuleType {
  QUERY_MODULE = "QUERY_MODULE",
  JS_MODULE = "JS_MODULE",
  UI_MODULE = "UI_MODULE",
}

export interface Module {
  id: string;
  name: string;
  packageId: string;
  type: ModuleType;
  settingsForm: any[];
  inputsForm?: any[];
  userPermissions: string[];
  metaData?: ModuleMetadata;
}

export interface ModuleMetadata {
  datasourceId?: string;
  moduleId: string;
  pluginId: string;
  pluginType: PluginType;
  publicEntity: any;
}

export interface PackageDetail {
  modules: Module[];
  modulesMetadata: ModuleMetadata[];
  packageData: Package;
}

export interface ModuleEntites {
  actions: any[];
  jsCollections: any[];
}
