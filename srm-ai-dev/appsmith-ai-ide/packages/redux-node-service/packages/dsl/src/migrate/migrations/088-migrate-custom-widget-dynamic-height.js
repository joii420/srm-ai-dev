"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateCustomWidgetDynamicHeight = void 0;
const utils_1 = require("../utils");
const migrateCustomWidgetDynamicHeight = (currentDSL) => {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (widget.type === "CUSTOM_WIDGET" && !widget.dynamicHeight) {
            widget.dynamicHeight = "FIXED";
        }
    });
};
exports.migrateCustomWidgetDynamicHeight = migrateCustomWidgetDynamicHeight;
//# sourceMappingURL=088-migrate-custom-widget-dynamic-height.js.map