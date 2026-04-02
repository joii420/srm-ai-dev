export * from "ce/workers/Evaluation/generateOverrideContext";
import ce_generateOverrideContext from "ce/workers/Evaluation/generateOverrideContext";
import type { GenerateOverrideContextProps } from "ce/workers/Evaluation/generateOverrideContext";
import { ENTITY_TYPE } from "entities/DataTree/dataTreeFactory";
import { has } from "lodash";

export function generateOverrideContextForModuleInstances(
  props: GenerateOverrideContextProps,
) {
  // Regex to parse the binding string to find paths with inputs
  const pathRegex = /\b([\w$]+)\.inputs\.\w+\b/g;
  const { bindings, dataTree, executionParams } = props;
  const overridingContext: Record<string, unknown> = {};

  bindings.forEach((binding) => {
    let match;

    const paths = [];
    while ((match = pathRegex.exec(binding)) !== null) {
      paths.push(match[0]);
    }

    paths.forEach((path) => {
      const [moduleInstanceName, , inputName] = path.split(".");
      const entity = dataTree[moduleInstanceName];

      // Check if this input exists for the module instance
      if (
        entity?.ENTITY_TYPE === ENTITY_TYPE.MODULE_INSTANCE &&
        has(dataTree, path) &&
        inputName in executionParams
      ) {
        overridingContext[path] = executionParams[inputName];
      }
    });
  });

  return overridingContext;
}

function generateOverrideContext(props: GenerateOverrideContextProps) {
  const ce_OverridingContext = ce_generateOverrideContext(props);

  const moduleInstanceOverridingContext =
    generateOverrideContextForModuleInstances(props);

  return {
    ...ce_OverridingContext,
    ...moduleInstanceOverridingContext,
  };
}

export default generateOverrideContext;
