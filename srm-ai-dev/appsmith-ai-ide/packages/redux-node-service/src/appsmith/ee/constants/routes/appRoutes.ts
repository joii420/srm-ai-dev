export * from "ce/constants/routes/appRoutes";
import {
  APP_SETTINGS_EDITOR_PATH,
  BUILDER_PATH,
  basePathForActiveAction as CE_basePathForActiveAction,
  DATA_SOURCES_EDITOR_ID_PATH,
  JS_COLLECTION_ID_PATH,
  QUERIES_EDITOR_ID_PATH,
  SAAS_GSHEET_EDITOR_ID_PATH,
} from "ce/constants/routes/appRoutes";
import { MODULE_EDITOR_PATH, PACKAGE_EDITOR_PATH } from "./packageRoutes";
import { matchPath } from "react-router";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { match } = require("path-to-regexp");

export const PACKAGE_BASE_PATH = "/pkg";
export const PACKAGE_PATH = `${PACKAGE_BASE_PATH}/:packageId`;
export const PACKAGE_MODULE_ID_EDITOR_PATH = `/:moduleId/edit`;
export const PACKAGE_MODULE_PATH = `${PACKAGE_PATH}${PACKAGE_MODULE_ID_EDITOR_PATH}`;

export interface ModuleRouteParams {
  packageId: string;
  moduleId: string;
}

export interface ModuleAPIEditorRouteParams extends ModuleRouteParams {
  apiId?: string;
}

export interface ModuleQueryEditorRouteParams extends ModuleRouteParams {
  pageId: string;
  queryId?: string;
  apiId?: string;
}

export interface ModuleJSEditorRouteParams extends ModuleRouteParams {
  collectionId?: string;
}

export const matchDatasourcePath = (pathname: string) =>
  matchPath(pathname, {
    path: [
      `${BUILDER_PATH}${DATA_SOURCES_EDITOR_ID_PATH}`,
      `${PACKAGE_EDITOR_PATH}${DATA_SOURCES_EDITOR_ID_PATH}`,
      `${MODULE_EDITOR_PATH}${DATA_SOURCES_EDITOR_ID_PATH}`,
    ],
    strict: false,
    exact: false,
  });

export const matchSAASGsheetsPath = (pathname: string) =>
  matchPath(pathname, {
    path: [
      `${BUILDER_PATH}${SAAS_GSHEET_EDITOR_ID_PATH}`,
      `${PACKAGE_EDITOR_PATH}${SAAS_GSHEET_EDITOR_ID_PATH}`,
      `${MODULE_EDITOR_PATH}${SAAS_GSHEET_EDITOR_ID_PATH}`,
    ],
    strict: false,
    exact: false,
  });

export const MODULE_INSTANCE_ID_PATH =
  "/module-instance/:moduleType/:moduleInstanceId";

export const basePathForActiveAction = [
  ...CE_basePathForActiveAction,
  MODULE_EDITOR_PATH,
];

export const matchQueryBuilderPath =
  match(BUILDER_PATH + QUERIES_EDITOR_ID_PATH) ||
  match(MODULE_EDITOR_PATH + QUERIES_EDITOR_ID_PATH);

export const matchPackagePath = (pathName: string) =>
  match(PACKAGE_EDITOR_PATH + DATA_SOURCES_EDITOR_ID_PATH)(pathName) ||
  match(MODULE_EDITOR_PATH + DATA_SOURCES_EDITOR_ID_PATH)(pathName) ||
  match(PACKAGE_EDITOR_PATH + JS_COLLECTION_ID_PATH)(pathName) ||
  match(MODULE_EDITOR_PATH + JS_COLLECTION_ID_PATH)(pathName) ||
  match(PACKAGE_EDITOR_PATH + QUERIES_EDITOR_ID_PATH)(pathName) ||
  match(MODULE_EDITOR_PATH + QUERIES_EDITOR_ID_PATH)(pathName);
