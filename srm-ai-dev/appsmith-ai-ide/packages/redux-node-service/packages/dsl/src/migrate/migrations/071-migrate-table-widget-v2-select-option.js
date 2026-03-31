"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTableWidgetV2SelectOption = void 0;
const utils_1 = require("../utils");
const migrateTableWidgetV2SelectOption = (currentDSL) => {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (widget.type === "TABLE_WIDGET_V2") {
            Object.values(widget.primaryColumns)
                .filter((column) => column.columnType === "select")
                .forEach((column) => {
                const selectOptions = column.selectOptions;
                if (selectOptions && (0, utils_1.isDynamicValue)(selectOptions)) {
                    column.selectOptions = `{{${widget.widgetName}.processedTableData.map((currentRow, currentIndex) => ( ${(0, utils_1.stringToJS)(selectOptions)}))}}`;
                }
            });
        }
    });
};
exports.migrateTableWidgetV2SelectOption = migrateTableWidgetV2SelectOption;
//# sourceMappingURL=071-migrate-table-widget-v2-select-option.js.map