"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTableSelectOptionAttributesForNewRow = void 0;
const utils_1 = require("../utils");
const migrateTableSelectOptionAttributesForNewRow = (currentDSL) => {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (widget.type === "TABLE_WIDGET_V2") {
            const primaryColumns = widget?.primaryColumns;
            // Set default value for allowSameOptionsInNewRow
            if (primaryColumns) {
                Object.values(primaryColumns).forEach((column) => {
                    if (column.hasOwnProperty("columnType") &&
                        column.columnType === "select") {
                        column.allowSameOptionsInNewRow = true;
                    }
                });
            }
        }
    });
};
exports.migrateTableSelectOptionAttributesForNewRow = migrateTableSelectOptionAttributesForNewRow;
//# sourceMappingURL=077-migrate-table-select-option-attributes-for-new-row.js.map