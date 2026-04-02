import { promisify } from "./utils/Promisify";

function closeQueryFnDescriptor(params: unknown) {
  return {
    type: "CLOSE_QUERY" as const,
    payload: { params },
  };
}

export type TCloseQueryArgs = Parameters<typeof closeQueryFnDescriptor>;
export type TCloseQueryDescription = ReturnType<typeof closeQueryFnDescriptor>;
export type TCloseQueryActionType = TCloseQueryDescription["type"];

async function closeQuery(...args: Parameters<typeof closeQueryFnDescriptor>) {
  return promisify(closeQueryFnDescriptor)(...args);
}

export default closeQuery;
