import { promisify } from "./utils/Promisify";

export enum COMMONDIALOG {
  attachment = "ATTACHMENT",
  selector = "SELECTOR",
}

export type commonDialogType = keyof typeof COMMONDIALOG;

export const COMMON_DIALOG_TYPE_OPTIONS = [
  { label: "Attachment", value: "'attachment'", id: "selector" },
  {
    label: "Selector",
    value: "'selector'",
    id: "selector",
  },
];

function showCommonDialogFnDescriptor(
  params: Record<string, unknown>,
  type: commonDialogType,
) {
  return {
    type: "SHOW_COMMON_DIALOG" as const,
    payload: { params, type },
  };
}

export type TShowCommonDialogArgs = Parameters<
  typeof showCommonDialogFnDescriptor
>;
export type TShowCommonDialogDescription = ReturnType<
  typeof showCommonDialogFnDescriptor
>;
export type TShowCommonDialogActionType = TShowCommonDialogDescription["type"];

async function showCommonDialog(
  ...args: Parameters<typeof showCommonDialogFnDescriptor>
) {
  return promisify(showCommonDialogFnDescriptor)(...args);
}

export default showCommonDialog;
