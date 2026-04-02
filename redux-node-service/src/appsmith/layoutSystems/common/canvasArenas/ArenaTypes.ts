export interface XYCord {
  x: number;
  y: number;
}

export interface WidgetDraggingBlock {
  left: number;
  top: number;
  width: number;
  height: number;
  widgetId: string;
  isNotColliding: boolean;
  columnWidth: number;
  rowHeight: number;
  type: string;
  fixedHeight?: number;
}

export interface WidgetDraggingUpdateParams extends WidgetDraggingBlock {
  updateWidgetParams: any;
}

export interface SelectedArenaDimensions {
  top: number;
  left: number;
  width: number;
  height: number;
}
