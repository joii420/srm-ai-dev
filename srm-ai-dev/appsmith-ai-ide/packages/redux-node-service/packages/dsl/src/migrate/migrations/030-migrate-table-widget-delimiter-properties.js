"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTableWidgetDelimiterProperties = void 0;
const migrateTableWidgetDelimiterProperties = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "TABLE_WIDGET") {
            if (!child.delimiter) {
                child.delimiter = ",";
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateTableWidgetDelimiterProperties)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateTableWidgetDelimiterProperties = migrateTableWidgetDelimiterProperties;
//# sourceMappingURL=030-migrate-table-widget-delimiter-properties.js.map