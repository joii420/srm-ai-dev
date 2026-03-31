"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTableWidgetParentRowSpaceProperty = void 0;
const migrateTableWidgetParentRowSpaceProperty = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "TABLE_WIDGET") {
            if (child.parentRowSpace === 40) {
                child.parentRowSpace = 10; //GridDefaults.DEFAULT_GRID_ROW_HEIGHT;
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateTableWidgetParentRowSpaceProperty)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateTableWidgetParentRowSpaceProperty = migrateTableWidgetParentRowSpaceProperty;
//# sourceMappingURL=022-migrate-table-widget-parent-row-space-property.js.map