"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTableWidgetV2Validation = void 0;
/*
 * Adds validation object to each column in the primaryColumns
 */
const migrateTableWidgetV2Validation = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "TABLE_WIDGET_V2") {
            const primaryColumns = child.primaryColumns;
            for (const key in primaryColumns) {
                if (primaryColumns.hasOwnProperty(key)) {
                    primaryColumns[key].validation = {};
                }
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateTableWidgetV2Validation)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateTableWidgetV2Validation = migrateTableWidgetV2Validation;
//# sourceMappingURL=060-migrate-table-widget-v2-validation.js.map