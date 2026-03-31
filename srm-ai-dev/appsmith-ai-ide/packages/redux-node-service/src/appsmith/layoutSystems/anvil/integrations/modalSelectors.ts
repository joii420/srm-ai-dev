import type { AppState } from "@appsmith/reducers";
import { getAllDetachedWidgetIds, getWidgetsMeta } from "sagas/selectors";

export const getCurrentlyOpenAnvilDetachedWidgets = (state: AppState) => {
  const allExistingDetachedWidgets = getAllDetachedWidgetIds(
    state.entities.canvasWidgets,
  );
  if (allExistingDetachedWidgets.length === 0) {
    return [];
  }
  const metaWidgets = getWidgetsMeta(state);
  const currentlyOpenWidgets = allExistingDetachedWidgets.filter(
    (detachedWidgetId) => {
      const detachedWidget = metaWidgets[detachedWidgetId];
      return detachedWidget && detachedWidget.isVisible;
    },
  );
  return currentlyOpenWidgets;
};
