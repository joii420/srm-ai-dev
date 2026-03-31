"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTableWidgetTableDataJsMode = void 0;
const utils_1 = require("../utils");
const migrateTableWidgetTableDataJsMode = (currentDSL) => {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (widget.type === "TABLE_WIDGET_V2") {
            const dynamicPropertyPathList = (widget.dynamicPropertyPathList || []).concat([
                {
                    key: "tableData",
                },
            ]);
            widget.dynamicPropertyPathList = dynamicPropertyPathList;
        }
    });
};
exports.migrateTableWidgetTableDataJsMode = migrateTableWidgetTableDataJsMode;
//# sourceMappingURL=079-migrate-table-widget-table-data-js-mode.js.map