import { promisify } from "./utils/Promisify";

function showMaterialsFnDescriptor(
  params: unknown,
  type: string,
) {
  return {
    type: "SHOW_MATERIALS" as const,
    payload: { params, type },
  };
}

export type TShowMaterialsArgs = Parameters<typeof showMaterialsFnDescriptor>;
export type TShowMaterialsDescription = ReturnType<
  typeof showMaterialsFnDescriptor
>;
export type TShowMaterialsActionType = TShowMaterialsDescription["type"];

async function showMaterials(
  ...args: Parameters<typeof showMaterialsFnDescriptor>
) {
  return promisify(showMaterialsFnDescriptor)(...args);
}

export default showMaterials;
