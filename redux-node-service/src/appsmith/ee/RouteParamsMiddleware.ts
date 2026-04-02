export * from "ce/RouteParamsMiddleware";
import { handler as CE_Handler } from "ce/RouteParamsMiddleware";
import type { Middleware } from "redux";
import {
  ReduxActionTypes,
  type ReduxAction,
} from "@appsmith/constants/ReduxActionConstants";
import type { PackageDetail } from "@appsmith/constants/PackageConstants";
import type {
  ModulesParams,
  PackageParams,
} from "./entities/URLRedirect/URLAssembly";
import urlBuilder from "./entities/URLRedirect/URLAssembly";
import type { Package } from "./constants/PackageConstants";
import { klona } from "klona";
import type { Module } from "./constants/ModuleConstants";

const handler = (action: ReduxAction<any>) => {
  switch (action?.type) {
    case ReduxActionTypes.FETCH_PACKAGE_SUCCESS: {
      const { modules, packageData }: PackageDetail = action.payload;
      const modulesParams: ModulesParams = {};
      const packageParams: PackageParams = {
        packageId: packageData.id,
        packageSlug: "",
      };

      modules.forEach(({ id }) => {
        modulesParams[id] = {
          moduleId: id,
          moduleSlug: "",
        };
      });

      urlBuilder.setPackageParams(packageParams);
      urlBuilder.setModulesParams(() => modulesParams);
      break;
    }
    case ReduxActionTypes.CREATE_PACKAGE_SUCCESS: {
      const pkg: Package = action.payload.package;
      const modulesParams: ModulesParams = {};
      const packageParams: PackageParams = {
        packageId: pkg.id,
        packageSlug: "",
      };

      urlBuilder.setPackageParams(packageParams);
      urlBuilder.setModulesParams(() => modulesParams);
      break;
    }
    case ReduxActionTypes.UPDATE_PACKAGE_SUCCESS: {
      const pkg: Package = action.payload;
      const packageParams: PackageParams = {
        packageId: pkg.id,
        packageSlug: "",
      };

      urlBuilder.setPackageParams(packageParams);
      break;
    }
    case ReduxActionTypes.REFACTOR_MODULE_NAME_SUCCESS:
    case ReduxActionTypes.CREATE_QUERY_MODULE_SUCCESS: {
      const module: Module = action.payload;

      urlBuilder.setModulesParams((currentParams) => {
        const updatedParams = klona(currentParams);
        updatedParams[module.id] = {
          moduleId: module.id,
          moduleSlug: "",
        };

        return updatedParams;
      });
      break;
    }
    case ReduxActionTypes.IMPORT_PACKAGE_SUCCESS: {
      const pkg: Package = action.payload;
      const packageParams: PackageParams = {
        packageId: pkg.id,
        packageSlug: "",
      };

      urlBuilder.setPackageParams(packageParams);
      break;
    }
  }
};

const routeParamsMiddleware: Middleware =
  () => (next: any) => (action: ReduxAction<any>) => {
    CE_Handler(action);
    handler(action);

    return next(action);
  };

export default routeParamsMiddleware;
