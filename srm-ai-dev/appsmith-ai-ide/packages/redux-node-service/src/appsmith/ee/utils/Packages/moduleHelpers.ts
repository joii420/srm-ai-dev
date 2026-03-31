import type { Module } from "@appsmith/constants/PackageConstants";
import { ModuleType } from "@appsmith/constants/PackageConstants";
import type { ModuleId } from "@appsmith/constants/ModuleInstanceConstants";
import type { PackagesReducerState } from "@appsmith/reducers/entityReducers/packagesReducer";
import type { ModulesReducerState } from "@appsmith/reducers/entityReducers/modulesReducer";

interface ExportPackageAsJSONFileProps {
  packageId: string;
  onSuccessCb?: () => void;
}

export const convertModulesToArray = (modules: ModulesReducerState) => {
  return Object.values(modules).map((module) => module);
};

export const selectAllQueryModules = (modules: Module[]) => {
  const queryModules = modules.filter(
    (module) => module.type === ModuleType.QUERY_MODULE,
  );
  return queryModules;
};

export const selectAllJSModules = (modules: Module[]) => {
  const jsModules = modules.filter(
    (module) => module.type === ModuleType.JS_MODULE,
  );
  return jsModules;
};

export const getModuleIdPackageNameMap = (
  modules: Module[],
  packages: PackagesReducerState,
) => {
  const modulePackageMap: Record<ModuleId, string> = {};

  modules.forEach((module) => {
    const pkgId = module.packageId;
    modulePackageMap[module.id] = packages[pkgId]?.name || "";
  });

  return modulePackageMap;
};

export const getExportPackageAPIRoute = (
  packageId: string,
  branchName?: string,
) => {
  let exportUrl = `/api/v1/packages/export/${packageId}`;
  if (branchName) {
    exportUrl += `?branchName=${branchName}`;
  }
  return exportUrl;
};

export const exportPackageAsJSONFile = ({
  onSuccessCb,
  packageId,
}: ExportPackageAsJSONFileProps) => {
  // export api response comes with content-disposition header.
  // there is no straightforward way to handle it with axios/fetch
  const id = `t--export-app-link`;
  const existingLink = document.getElementById(id);
  existingLink && existingLink.remove();
  const link = document.createElement("a");

  link.href = getExportPackageAPIRoute(packageId);
  link.id = id;
  document.body.appendChild(link);
  // @ts-expect-error: Types are not available
  if (!window.Cypress) {
    link.click();
  }

  onSuccessCb?.();
};
