import { promisify } from "./utils/Promisify";

function getWidgetsFnDescriptor() {
  return {
    type: "GET_WIDGETS" as const,
    payload: null,
  };
}

export type TGetWidgetsArgs = Parameters<typeof getWidgetsFnDescriptor>;
export type TGetWidgetsDescription = ReturnType<typeof getWidgetsFnDescriptor>;
export type TGetWidgetsActionType = TGetWidgetsDescription["type"];

async function getWidgets(...args: Parameters<typeof getWidgetsFnDescriptor>) {
  const result = await promisify(getWidgetsFnDescriptor)(...args);
  return result;
}

export default getWidgets;
