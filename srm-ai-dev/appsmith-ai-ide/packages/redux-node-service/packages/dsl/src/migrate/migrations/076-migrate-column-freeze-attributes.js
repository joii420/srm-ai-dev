"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateColumnFreezeAttributes = void 0;
const utils_1 = require("../utils");
const migrateColumnFreezeAttributes = (currentDSL) => {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (widget.type === "TABLE_WIDGET_V2") {
            const primaryColumns = widget?.primaryColumns;
            // Assign default sticky value to each column
            if (primaryColumns) {
                for (const column in primaryColumns) {
                    if (!primaryColumns[column].hasOwnProperty("sticky")) {
                        primaryColumns[column].sticky = "";
                    }
                }
            }
            widget.canFreezeColumn = false;
            widget.columnUpdatedAt = Date.now();
        }
    });
};
exports.migrateColumnFreezeAttributes = migrateColumnFreezeAttributes;
//# sourceMappingURL=076-migrate-column-freeze-attributes.js.map