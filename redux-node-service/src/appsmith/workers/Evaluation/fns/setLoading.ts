import { promisify } from "./utils/Promisify";

function setLoadingFnDescriptor(params: unknown) {
  return {
    type: "SET_LOADING" as const,
    payload: { params },
  };
}

export type TSetLoadingyArgs = Parameters<typeof setLoadingFnDescriptor>;
export type TSetLoadingDescription = ReturnType<typeof setLoadingFnDescriptor>;
export type TSetLoadingActionType = TSetLoadingDescription["type"];

async function setLoading(...args: Parameters<typeof setLoadingFnDescriptor>) {
  return promisify(setLoadingFnDescriptor)(...args);
}

export default setLoading;
