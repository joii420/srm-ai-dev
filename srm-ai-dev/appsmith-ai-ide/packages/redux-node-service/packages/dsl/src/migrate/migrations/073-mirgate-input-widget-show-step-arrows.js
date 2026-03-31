"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateInputWidgetShowStepArrows = void 0;
const utils_1 = require("../utils");
const migrateInputWidgetShowStepArrows = (currentDSL) => {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if ((widget.type === "CURRENCY_INPUT_WIDGET" ||
            (widget.type === "INPUT_WIDGET_V2" && widget.inputType === "NUMBER")) &&
            widget.showStepArrows === undefined) {
            widget.showStepArrows = true;
        }
    });
};
exports.migrateInputWidgetShowStepArrows = migrateInputWidgetShowStepArrows;
//# sourceMappingURL=073-mirgate-input-widget-show-step-arrows.js.map