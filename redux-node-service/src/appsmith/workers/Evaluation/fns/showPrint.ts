import { promisify } from "./utils/Promisify";

function showPrintFnDescriptor(params: unknown) {
  return {
    type: "SHOW_PRINT" as const,
    payload: { params },
  };
}

export type TShowPrintArgs = Parameters<typeof showPrintFnDescriptor>;
export type TShowPrintDescription = ReturnType<typeof showPrintFnDescriptor>;
export type TShowPrintActionType = TShowPrintDescription["type"];

async function showPrint(...args: Parameters<typeof showPrintFnDescriptor>) {
  return promisify(showPrintFnDescriptor)(...args);
}

export default showPrint;
