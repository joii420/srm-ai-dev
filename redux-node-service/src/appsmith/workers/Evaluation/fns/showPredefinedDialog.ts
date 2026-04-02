import { promisify } from "./utils/Promisify";

function showPredefinedDialogFnDescriptor(params: unknown) {
  return {
    type: "SHOW_PREDEFINED_DIALOG" as const,
    payload: { params },
  };
}

export type TShowPredefinedDialogArgs = Parameters<
  typeof showPredefinedDialogFnDescriptor
>;
export type TShowPredefinedDialogDescription = ReturnType<
  typeof showPredefinedDialogFnDescriptor
>;
export type TShowPredefinedDialogActionType =
  TShowPredefinedDialogDescription["type"];

async function showPredefinedDialog(
  ...args: Parameters<typeof showPredefinedDialogFnDescriptor>
) {
  return promisify(showPredefinedDialogFnDescriptor)(...args);
}

export default showPredefinedDialog;
