"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateMenuButtonDynamicItemsInsideTableWidget = void 0;
const utils_1 = require("../utils");
const migrateMenuButtonDynamicItemsInsideTableWidget = (currentDSL) => {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (widget.type === "TABLE_WIDGET_V2") {
            const primaryColumns = widget.primaryColumns;
            if (primaryColumns) {
                for (const column in primaryColumns) {
                    if (primaryColumns.hasOwnProperty(column) &&
                        primaryColumns[column].columnType === "menuButton" &&
                        !primaryColumns[column].menuItemsSource) {
                        primaryColumns[column].menuItemsSource = "STATIC";
                    }
                }
            }
        }
    });
};
exports.migrateMenuButtonDynamicItemsInsideTableWidget = migrateMenuButtonDynamicItemsInsideTableWidget;
//# sourceMappingURL=074-migrate-mwnu-button-dynamic-items-inside-table-widget.js.map