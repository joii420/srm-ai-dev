import TriggerEmitter, { BatchKey } from "./utils/TriggerEmitter";
import ExecutionMetaData from "./utils/ExecutionMetaData";
import setters from "workers/Evaluation/setters";
import { promisify } from "./utils/Promisify";

function operateWidgetSyncFnDescriptor(
  widgetName: string,
  method: string,
  params: unknown,
) {
  return {
    type: "OPERATE_WIDGET_BY_NAME_SYNC" as const,
    payload: { widgetName, method, params },
  };
}

export type TOperateWidgetSyncArgs = Parameters<
  typeof operateWidgetSyncFnDescriptor
>;
export type TOperateWidgetSyncDescription = ReturnType<
  typeof operateWidgetSyncFnDescriptor
>;
export type TOperateWidgetSyncActionType =
  TOperateWidgetSyncDescription["type"];

async function operateWidgetSync(
  ...args: Parameters<typeof operateWidgetSyncFnDescriptor>
) {
  const result: any = await promisify(operateWidgetSyncFnDescriptor)(...args);
  if (
    result &&
    result.__metaUpdate &&
    Object.keys(result.__metaUpdate).length
  ) {
    // console.log("+= operate widget ", args, result.__metaUpdate);
    const widgetName = args[0];
    await Promise.all(
      Object.keys(result.__metaUpdate).map(async (key) => {
        const value = result.__metaUpdate[key];
        return await setters.applySetterMethod(
          `${widgetName}.${key}`,
          value,
          "__operateWidgetSync",
        );
      }),
    );
    return Promise.resolve(result.data);
  }
  return Promise.resolve(result);
  // const metaData = ExecutionMetaData.getExecutionMetaData();
  // TriggerEmitter.emit(BatchKey.process_batched_triggers, {
  //   trigger: operateWidgetSyncFnDescriptor(...args),
  //   ...metaData,
  // });
}

export default operateWidgetSync;
