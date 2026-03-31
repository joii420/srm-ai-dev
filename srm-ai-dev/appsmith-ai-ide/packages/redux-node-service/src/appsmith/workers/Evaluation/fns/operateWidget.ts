import { promisify } from "./utils/Promisify";

function operateWidgetFnDescriptor(
  widgetName: string,
  method: string,
  params: unknown,
) {
  return {
    type: "OPERATE_WIDGET_BY_NAME" as const,
    payload: { widgetName, method, params },
  };
}

export type TOperateWidgetArgs = Parameters<typeof operateWidgetFnDescriptor>;
export type TOperateWidgetDescription = ReturnType<
  typeof operateWidgetFnDescriptor
>;
export type TOperateWidgetActionType = TOperateWidgetDescription["type"];

async function operateWidget(
  ...args: Parameters<typeof operateWidgetFnDescriptor>
) {
  return promisify(operateWidgetFnDescriptor)(...args);
}

export default operateWidget;
