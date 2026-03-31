"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateSelectWidgetOptionToSourceData = void 0;
const utils_1 = require("../utils");
function migrateSelectWidgetOptionToSourceData(currentDSL) {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (["SELECT_WIDGET", "MULTI_SELECT_WIDGET_V2"].includes(widget.type) &&
            widget.options) {
            widget.sourceData = widget.options;
            widget.optionLabel = "label";
            widget.optionValue = "value";
            delete widget.options;
        }
    });
}
exports.migrateSelectWidgetOptionToSourceData = migrateSelectWidgetOptionToSourceData;
//# sourceMappingURL=080-migrate-select-widget-option-to-source-data.js.map