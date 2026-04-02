import { apply, select, put } from "redux-saga/effects";
import { getWidgetByName } from "sagas/selectors";
import {
  ActionValidationError,
  TriggerFailureError,
} from "sagas/ActionExecution/errorUtils";
import { getType, Types } from "utils/TypeHelpers";
import type { FlattenedWidgetProps } from "WidgetProvider/constants";
import { getDataTree } from "selectors/dataTreeSelectors";
import type { DataTree } from "entities/DataTree/dataTreeTypes";
import { isWidget } from "@appsmith/workers/Evaluation/evaluationUtils";
import type { TOperateWidgetSyncDescription } from "workers/Evaluation/fns/operateWidgetSync";
import globalStore from "utils/GlobalStore";
import _ from "lodash";
import { getPagePs } from "selectors/pageSelectors";

export default function* operateWidgetActionSyncSaga(
  action: TOperateWidgetSyncDescription,
) {
  const { payload } = action;
  const { widgetName, method, params } = payload;
  if (getType(widgetName) !== Types.STRING) {
    throw new ActionValidationError(
      "OPERATE_WIDGET_BY_NAME_SYNC",
      "widgetName",
      Types.STRING,
      getType(widgetName),
    );
  }

  const dataTree: DataTree = yield select(getDataTree);
  // const configTree: ConfigTree = yield select(getConfigTree);

  const widget: FlattenedWidgetProps | undefined = yield select(
    getWidgetByName,
    widgetName,
  );
  if (!widget) {
    throw new TriggerFailureError(`Widget ${widgetName} not found`);
  }
  const evaluatedEntity = dataTree[widget.widgetName];
  // const evaluatedEntityConfig = configTree[widget.widgetName];
  if (isWidget(evaluatedEntity)) {
    const ps: string = yield select(getPagePs);
    const widgetRef = globalStore.get(evaluatedEntity.widgetId, ps);
    const fn = widgetRef[method];
    if (typeof fn === "function") {
      const result: unknown = yield apply(widgetRef, fn, params as any);
      // const result: unknown = fn.call(widgetRef, params as any);
      return result;
    } else {
      throw new TriggerFailureError(
        `OperateWidget执行出错，找不到函数：${widgetRef.props.widgetName}.${method}(${params})`,
      );
    }
  }
}
