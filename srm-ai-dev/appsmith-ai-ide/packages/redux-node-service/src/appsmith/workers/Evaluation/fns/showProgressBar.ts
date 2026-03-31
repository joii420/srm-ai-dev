import { promisify } from "./utils/Promisify";

function showProgressBarFnDescriptor(params: unknown) {
  return {
    type: "SHOW_PROGRESS_BAR" as const,
    payload: { params },
  };
}

export type TShowProgressBarArgs = Parameters<
  typeof showProgressBarFnDescriptor
>;
export type TShowProgressBarDescription = ReturnType<
  typeof showProgressBarFnDescriptor
>;
export type TShowProgressBarActionType = TShowProgressBarDescription["type"];

async function showProgressBar(
  ...args: Parameters<typeof showProgressBarFnDescriptor>
) {
  return promisify(showProgressBarFnDescriptor)(...args);
}

export default showProgressBar;
