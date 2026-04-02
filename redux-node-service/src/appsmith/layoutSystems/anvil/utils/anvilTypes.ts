export type LayoutComponentType =
  | "ALIGNED_LAYOUT_COLUMN"
  | "ALIGNED_WIDGET_COLUMN"
  | "ALIGNED_WIDGET_ROW"
  | "LAYOUT_COLUMN"
  | "LAYOUT_ROW"
  | "SECTION"
  | "WIDGET_COLUMN"
  | "WIDGET_ROW"
  | "ZONE";

export enum LayoutComponentTypes {
  ALIGNED_LAYOUT_COLUMN = "ALIGNED_LAYOUT_COLUMN",
  ALIGNED_WIDGET_COLUMN = "ALIGNED_WIDGET_COLUMN",
  ALIGNED_WIDGET_ROW = "ALIGNED_WIDGET_ROW",
  LAYOUT_COLUMN = "LAYOUT_COLUMN",
  LAYOUT_ROW = "LAYOUT_ROW",
  SECTION = "SECTION",
  WIDGET_COLUMN = "WIDGET_COLUMN",
  WIDGET_ROW = "WIDGET_ROW",
  ZONE = "ZONE",
}

export interface LayoutProps {
  layout: LayoutProps[] | string[];
  layoutId: string;
  layoutStyle?: Record<string, string>;
  layoutType: LayoutComponentType;
  allowedWidgetTypes?: string[];
  childTemplate?: LayoutProps;
  isContainer?: boolean;
  isDropTarget?: boolean;
  insertChild?: boolean;
  isPermanent?: boolean;
  maxChildLimit?: number;
}

export interface DraggedWidget {
  widgetId: string;
  type: string;
  parentId?: string;
  responsiveBehavior?: string;
}

export interface AnvilHighlightInfo {
  layoutId: string;
  canvasId: string;
  rowIndex: number;
  alignment: string;
  isVertical: boolean;
  posX: number;
  posY: number;
  width: number;
  height: number;
  isNewLayer?: boolean;
  edgeDetails?: Record<string, any>;
  existingPositionHighlight?: boolean;
  layoutOrder?: string[];
  dropZone?: Record<string, any>;
}
