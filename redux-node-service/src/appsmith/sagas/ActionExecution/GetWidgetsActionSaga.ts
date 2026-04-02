import { select } from "redux-saga/effects";
import { getDataTree } from "selectors/dataTreeSelectors";
import type { DataTree, WidgetEntity } from "entities/DataTree/dataTreeFactory";
import _ from "lodash";
import { isWidget } from "@appsmith/workers/Evaluation/evaluationUtils";
import { getWidgets } from "sagas/selectors";
import type { CanvasWidgetsReduxState } from "reducers/entityReducers/canvasWidgetsReducer";

export default function* getWidgetsActionSaga() {
  const dataTree: DataTree = yield select(getDataTree);
  const canvasWidgets: CanvasWidgetsReduxState = yield select(getWidgets);
  const originalWidgets = _.pickBy(dataTree, isWidget);
  const widgets = _.mapValues(originalWidgets, (entity: WidgetEntity) => {
    const { widgetId } = entity;
    const newEntity: any = _.omit(entity, "__evaluation__");
    if (canvasWidgets[widgetId]?.children?.length) {
      newEntity.children = canvasWidgets[widgetId].children?.map(
        (childId: string) => canvasWidgets[childId].widgetName,
      );
    }
    return newEntity;
  });
  _.mapValues(widgets, (entity: WidgetEntity) => {
    const { children, widgetId } = entity;
    if (children?.length) {
      children.map((child: string) => (widgets[child] as any)["parentId"] = widgetId);
    }
  });
  return widgets;
}
