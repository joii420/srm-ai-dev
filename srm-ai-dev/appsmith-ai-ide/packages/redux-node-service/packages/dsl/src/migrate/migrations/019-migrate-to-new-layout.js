"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToNewLayout = exports.getCanvasSnapRows = void 0;
const DEFAULT_GRID_ROW_HEIGHT = 10;
const GRID_DENSITY_MIGRATION_V1 = 4;
const getCanvasSnapRows = (bottomRow, mobileBottomRow, isMobile, isAutoLayoutActive) => {
    const bottom = isMobile && mobileBottomRow !== undefined && isAutoLayoutActive
        ? mobileBottomRow
        : bottomRow;
    const totalRows = Math.floor(bottom / DEFAULT_GRID_ROW_HEIGHT);
    return isAutoLayoutActive ? totalRows : totalRows - 1;
};
exports.getCanvasSnapRows = getCanvasSnapRows;
const migrateToNewLayout = (dsl) => {
    const scaleWidget = (widgetProps) => {
        widgetProps.bottomRow *= GRID_DENSITY_MIGRATION_V1;
        widgetProps.topRow *= GRID_DENSITY_MIGRATION_V1;
        widgetProps.leftColumn *= GRID_DENSITY_MIGRATION_V1;
        widgetProps.rightColumn *= GRID_DENSITY_MIGRATION_V1;
        if (widgetProps.children && widgetProps.children.length) {
            widgetProps.children.forEach((eachWidgetProp) => {
                scaleWidget(eachWidgetProp);
            });
        }
    };
    scaleWidget(dsl);
    return dsl;
};
exports.migrateToNewLayout = migrateToNewLayout;
//# sourceMappingURL=019-migrate-to-new-layout.js.map