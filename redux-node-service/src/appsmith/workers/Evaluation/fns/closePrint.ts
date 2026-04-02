import { promisify } from "./utils/Promisify";

function closePrintFnDescriptor(params: unknown) {
  return {
    type: "CLOSE_PRINT" as const,
    payload: { params },
  };
}

export type TClosePrintArgs = Parameters<typeof closePrintFnDescriptor>;
export type TClosePrintDescription = ReturnType<typeof closePrintFnDescriptor>;
export type TClosePrintActionType = TClosePrintDescription["type"];

async function closePrint(...args: Parameters<typeof closePrintFnDescriptor>) {
  return promisify(closePrintFnDescriptor)(...args);
}

export default closePrint;
