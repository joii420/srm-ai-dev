import type { DataTree } from "entities/DataTree/dataTreeTypes";
import { isObject, set } from "lodash";
import { klona } from "klona/json";
import type { EvalProps } from "workers/common/DataTreeEvaluator";

//修改
const needKlona = (unEvalTree: object) => {
  let dataTemp = Object.assign({}, unEvalTree, {
    INIT: {
      ...unEvalTree?.INIT,
      g_pmsaa_m: { ...unEvalTree?.INIT?.g_pmsaa_m, source: undefined },
    },
  });
  let safeTree = klona(dataTemp);
  if (unEvalTree?.INIT?.g_pmsaa_m?.source) {
    safeTree.INIT.g_pmsaa_m.source = unEvalTree?.INIT?.g_pmsaa_m.source;
  }
  return safeTree;
};
/**
 * This method loops through each entity object of dataTree and sets the entity config from prototype as object properties.
 * This is done to send back dataTree in the format expected by mainThread.
 */
export function makeEntityConfigsAsObjProperties(
  dataTree: DataTree,
  option = {} as {
    sanitizeDataTree?: boolean;
    evalProps?: EvalProps;
  },
): DataTree {
  const { evalProps, sanitizeDataTree = true } = option;
  const newDataTree: DataTree = {};
  for (const entityName of Object.keys(dataTree)) {
    const entity = dataTree[entityName];
    newDataTree[entityName] = isObject(entity)
      ? Object.assign({}, entity)
      : entity;
  }
  //修改
  const dataTreeToReturn = sanitizeDataTree
    ? needKlona(newDataTree)
    : newDataTree;

  if (!evalProps) return dataTreeToReturn;

  for (const [entityName, entityEvalProps] of Object.entries(evalProps)) {
    if (!entityEvalProps.__evaluation__) continue;
    set(
      dataTreeToReturn[entityName],
      "__evaluation__",
      klona({ errors: entityEvalProps.__evaluation__.errors }),
    );
  }

  return dataTreeToReturn;
}
