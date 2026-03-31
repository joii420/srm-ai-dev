import { promisify } from "./utils/Promisify";

function showMessageFnDescriptor(params: unknown, type: string, type2: string) {
  return {
    type: "SHOW_MESSAGE" as const,
    payload: { params, type, type2 },
  };
}

export type TShowMessageArgs = Parameters<typeof showMessageFnDescriptor>;
export type TShowMessageDescription = ReturnType<
  typeof showMessageFnDescriptor
>;
export type TShowMessageActionType = TShowMessageDescription["type"];

async function showMessage(
  ...args: Parameters<typeof showMessageFnDescriptor>
) {
  return promisify(showMessageFnDescriptor)(...args);
}

export default showMessage;
