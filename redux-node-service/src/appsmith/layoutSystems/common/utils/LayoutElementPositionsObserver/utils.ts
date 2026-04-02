export const ANVIL_LAYER = "anvil_layer";
export const ANVIL_WIDGET = "anvil_widget";
export const LAYOUT = "layout";

export const getAnvilWidgetDOMId = (widgetId: string) => {
  return ANVIL_WIDGET + "_" + widgetId;
};

export const getAnvilLayoutDOMId = (canvasId: string, layoutId: string) => {
  return LAYOUT + "_" + canvasId + "_" + layoutId;
};

export const extractLayoutIdFromLayoutDOMId = (layoutDOMId: string) => {
  return layoutDOMId.split("_")[2];
};

export function extractWidgetIdFromAnvilWidgetDOMId(anvilWidgetDOMId: string) {
  return anvilWidgetDOMId.split("_")[2];
}
