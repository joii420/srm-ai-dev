export interface LayoutElementPosition {
  left: number;
  top: number;
  height: number;
  width: number;
  offsetLeft: number;
  offsetTop: number;
}

export interface LayoutElementPositions {
  [widgetId: string]: LayoutElementPosition;
}
