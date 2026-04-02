export interface CopiedWidgetData {
  hierarchy: number;
  list: any[];
  parentId: string;
  widgetId: string;
  widgetPositionInfo?: any;
}

export interface PasteDestinationInfo {
  alignment: string;
  layoutOrder: string[];
  parentOrder: string[];
  rowIndex: number;
}

export interface PastePayload {
  widgets: any[];
  widgetIdMap: Record<string, string>;
  reverseWidgetIdMap: Record<string, string>;
}
