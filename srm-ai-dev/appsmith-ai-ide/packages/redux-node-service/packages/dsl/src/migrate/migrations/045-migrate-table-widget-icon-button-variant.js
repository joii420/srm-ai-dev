"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTableWidgetIconButtonVariant = void 0;
const migrateTableWidgetIconButtonVariant = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "TABLE_WIDGET") {
            const primaryColumns = child.primaryColumns;
            Object.keys(primaryColumns).forEach((accessor) => {
                const primaryColumn = primaryColumns[accessor];
                if (primaryColumn.columnType === "iconButton") {
                    if (!("buttonVariant" in primaryColumn)) {
                        primaryColumn.buttonVariant = "TERTIARY";
                    }
                }
            });
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateTableWidgetIconButtonVariant)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateTableWidgetIconButtonVariant = migrateTableWidgetIconButtonVariant;
//# sourceMappingURL=045-migrate-table-widget-icon-button-variant.js.map