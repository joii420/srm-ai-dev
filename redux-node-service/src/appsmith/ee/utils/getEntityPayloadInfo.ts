export * from "ce/utils/getEntityPayloadInfo";
import {
  ENTITY_TYPE,
  type ModuleInstanceEntityConfig,
} from "@appsmith/entities/DataTree/types";
import { getCurrentModule } from "@appsmith/selectors/entitiesSelector";
import { getModuleInstanceById } from "@appsmith/selectors/moduleInstanceSelectors";
import { getEntityPayloadInfo as CE_getEntityPayloadInfo } from "ce/utils/getEntityPayloadInfo";

export const getEntityPayloadInfo: typeof CE_getEntityPayloadInfo = {
  ...CE_getEntityPayloadInfo,
  [ENTITY_TYPE.MODULE_INPUT]: (_, state) => {
    const currentModule = getCurrentModule(state)!;
    return {
      iconId: currentModule.type,
      id: currentModule.id,
    };
  },
  [ENTITY_TYPE.MODULE_INSTANCE]: (entityConfig, state) => {
    const config = entityConfig as ModuleInstanceEntityConfig;
    const moduleInstance = getModuleInstanceById(
      state,
      config.moduleInstanceId,
    );
    return {
      iconId: config.type,
      id: config.moduleInstanceId,
      entityName: moduleInstance?.name,
    };
  },
  [ENTITY_TYPE.WIDGET]: (entityConfig, state) => {
    return CE_getEntityPayloadInfo[ENTITY_TYPE.WIDGET](entityConfig, state);
  },
  [ENTITY_TYPE.JSACTION]: (entityConfig, state) => {
    const payloadInfo =
      CE_getEntityPayloadInfo[ENTITY_TYPE.JSACTION](entityConfig, state);

    const config = entityConfig as ModuleInstanceEntityConfig;
    if (!config.moduleInstanceId) return payloadInfo;
    const moduleInstance = getModuleInstanceById(
      state,
      config.moduleInstanceId,
    );
    payloadInfo.entityName = moduleInstance?.name;
    return payloadInfo;
  },
  [ENTITY_TYPE.ACTION]: (entityConfig, state) => {
    const payloadInfo =
      CE_getEntityPayloadInfo[ENTITY_TYPE.ACTION](entityConfig, state);

    const config = entityConfig as ModuleInstanceEntityConfig;
    if (!config.moduleInstanceId) return payloadInfo;
    const moduleInstance = getModuleInstanceById(
      state,
      config.moduleInstanceId,
    );

    payloadInfo.entityName = moduleInstance?.name;
    return payloadInfo;
  },
};
