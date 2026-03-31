export * from "ce/utils/actionExecutionUtils";

import {
  getCurrentModule,
  getModuleInstances,
} from "@appsmith/selectors/entitiesSelector";
import {
  getModuleInstanceActions,
  getModuleInstanceJSCollections,
} from "@appsmith/selectors/modulesSelector";
import type { Action } from "entities/Action";
import type { JSAction, JSCollection } from "entities/JSCollection";
// import store from "store";
import {
  getActionExecutionAnalytics as CE_getActionExecutionAnalytics,
  getCollectionNameToDisplay as CE_getCollectionNameToDisplay,
} from "ce/utils/actionExecutionUtils";
import type { Plugin } from "api/PluginApi";
import type { ApplicationPayload } from "@appsmith/constants/ReduxActionConstants";
import { getCurrentPackage } from "@appsmith/selectors/packageSelectors";
import { getModuleInstanceById } from "@appsmith/selectors/moduleInstanceSelectors";
import { isBrowserExecutionAllowed as CE_isBrowserExecutionAllowed } from "ce/utils/actionExecutionUtils";

export function getPluginActionNameToDisplay(action: Action, state: any) {
  const moduleInstanceActions = getModuleInstanceActions(state);

  for (const moduleInstanceAction of moduleInstanceActions) {
    if (moduleInstanceAction.config.id === action.id) {
      const moduleInstanceId = moduleInstanceAction.config.moduleInstanceId;
      if (!moduleInstanceId) break;
      const moduleInstances = getModuleInstances(state);
      const moduleInstance = moduleInstances[moduleInstanceId];
      if (!moduleInstance) break;
      return moduleInstance.name;
    }
  }

  return action.name;
}

export function getCollectionNameToDisplay(
  action: JSAction,
  collectionName: string,
  state: any,
) {
  if (!action.moduleInstanceId)
    return CE_getCollectionNameToDisplay(action, collectionName);
  const moduleInstance = getModuleInstanceById(
    state,
    action.moduleInstanceId,
  );
  return moduleInstance?.name || collectionName;
}

export function getJSActionPathNameToDisplay(
  action: JSAction,
  collection: JSCollection,
  state: any,
) {
  const moduleInstanceJSCollections = getModuleInstanceJSCollections(
    state,
  );

  for (const moduleInstanceJSCollection of moduleInstanceJSCollections) {
    const moduleInstanceJSActions = moduleInstanceJSCollection.config.actions;
    for (const moduleInstanceJSAction of moduleInstanceJSActions) {
      if (moduleInstanceJSAction.id === action.id) {
        const moduleInstanceId =
          moduleInstanceJSCollection.config.moduleInstanceId;
        if (!moduleInstanceId) break;
        const moduleInstances = getModuleInstances(state);
        const moduleInstance = moduleInstances[moduleInstanceId];
        if (!moduleInstance) break;
        return moduleInstance.name + "." + action.name;
      }
    }
  }

  return collection.name + "." + action.name;
}

export function getJSActionNameToDisplay(action: JSAction) {
  return action.name;
}

export function getActionExecutionAnalytics(
  action: Action,
  plugin: Plugin,
  params: Record<string, unknown>,
  currentApp: ApplicationPayload,
  datasourceId: string,
  state: any,
) {
  const analyticsData = CE_getActionExecutionAnalytics(
    action,
    plugin,
    params,
    currentApp,
    datasourceId,
    state,
  );
  if (!!currentApp) return analyticsData;

  const currentPackage = getCurrentPackage(state);
  const currentModule = getCurrentModule(state);
  return {
    ...analyticsData,
    packageId: currentPackage?.id,
    packageName: currentPackage?.name,
    moduleId: currentModule?.id,
    moduleName: currentModule?.name,
  };
}

export function isBrowserExecutionAllowed(
  collection?: JSCollection,
  action?: JSAction,
): boolean {
  if (!collection || !action)
    return CE_isBrowserExecutionAllowed(collection, action);
  return !(
    !!collection.isMainJSCollection && action.name === "executeWorkflow"
  );
}
