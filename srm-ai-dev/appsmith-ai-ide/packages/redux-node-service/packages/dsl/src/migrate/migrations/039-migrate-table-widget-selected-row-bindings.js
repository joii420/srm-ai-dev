"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTableWidgetSelectedRowBindings = void 0;
const utils_1 = require("../utils");
const getUpdatedColumns = (widgetName, columns) => {
    const updatedColumns = {};
    if (columns && Object.keys(columns).length > 0) {
        for (const [columnId, columnProps] of Object.entries(columns)) {
            const sanitizedColumnId = (0, utils_1.removeSpecialChars)(columnId, 200);
            const selectedRowBindingValue = `${widgetName}.selectedRow`;
            let newOnClickBindingValue = undefined;
            if (columnProps.onClick &&
                columnProps.onClick.includes(selectedRowBindingValue)) {
                newOnClickBindingValue = columnProps.onClick.replace(selectedRowBindingValue, "currentRow");
            }
            updatedColumns[sanitizedColumnId] = columnProps;
            if (newOnClickBindingValue)
                updatedColumns[sanitizedColumnId].onClick = newOnClickBindingValue;
        }
    }
    return updatedColumns;
};
const migrateTableWidgetSelectedRowBindings = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "TABLE_WIDGET") {
            child.derivedColumns = getUpdatedColumns(child.widgetName, child.derivedColumns);
            child.primaryColumns = getUpdatedColumns(child.widgetName, child.primaryColumns);
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateTableWidgetSelectedRowBindings)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateTableWidgetSelectedRowBindings = migrateTableWidgetSelectedRowBindings;
//# sourceMappingURL=039-migrate-table-widget-selected-row-bindings.js.map