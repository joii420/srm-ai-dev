import { promisify } from "./utils/Promisify";

function showQueryFnDescriptor(params: unknown) {
  return {
    type: "SHOW_QUERY" as const,
    payload: { params },
  };
}

export type TShowQueryArgs = Parameters<typeof showQueryFnDescriptor>;
export type TShowQueryDescription = ReturnType<typeof showQueryFnDescriptor>;
export type TShowQueryActionType = TShowQueryDescription["type"];

async function showQuery(...args: Parameters<typeof showQueryFnDescriptor>) {
  return promisify(showQueryFnDescriptor)(...args);
}

export default showQuery;
