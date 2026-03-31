import { GridDefaults } from "constants/WidgetConstants";
import { LayoutSystemTypes } from "layoutSystems/types";

export const getAutoLayoutComponentDimensions = ({
  bottomRow,
  isMobile,
  leftColumn,
  mobileBottomRow,
  mobileLeftColumn,
  mobileRightColumn,
  mobileTopRow,
  parentColumnSpace,
  parentRowSpace,
  rightColumn,
  topRow,
}: any) => {
  let left = leftColumn;
  let right = rightColumn;
  let top = topRow;
  let bottom = bottomRow;
  if (isMobile) {
    if (mobileLeftColumn !== undefined && parentColumnSpace !== 1) left = mobileLeftColumn;
    if (mobileRightColumn !== undefined && parentColumnSpace !== 1) right = mobileRightColumn;
    if (mobileTopRow !== undefined && parentRowSpace !== 1) top = mobileTopRow;
    if (mobileBottomRow !== undefined && parentRowSpace !== 1) bottom = mobileBottomRow;
  }
  return {
    componentWidth: (right - left) * parentColumnSpace,
    componentHeight: (bottom - top) * parentRowSpace,
  };
};

export const getFixedLayoutComponentDimensions = ({
  bottomRow,
  leftColumn,
  parentColumnSpace,
  parentRowSpace,
  rightColumn,
  topRow,
}: any) => {
  return {
    componentWidth: (rightColumn - leftColumn) * parentColumnSpace,
    componentHeight:
      (bottomRow - topRow) *
      (parentRowSpace || GridDefaults.DEFAULT_GRID_ROW_HEIGHT),
  };
};

export const getComponentDimensions = (
  props: any,
  layoutSystemType: LayoutSystemTypes,
  isMobile = false,
): { componentHeight?: number; componentWidth?: number } => {
  switch (layoutSystemType) {
    case LayoutSystemTypes.ANVIL:
      return {};
    case LayoutSystemTypes.AUTO:
      return getAutoLayoutComponentDimensions({ ...props, isMobile });
    default:
      return getFixedLayoutComponentDimensions(props);
  }
};
