"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateInputWidgetsMultiLineInputType = void 0;
const utils_1 = require("../utils");
const GRID_DENSITY_MIGRATION_V1 = 4;
function migrateInputWidgetsMultiLineInputType(currentDSL) {
    if (!currentDSL)
        return currentDSL;
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (widget.type === "INPUT_WIDGET_V2") {
            const minInputSingleLineHeight = widget.label || widget.tooltip
                ? // adjust height for label | tooltip extra div
                    GRID_DENSITY_MIGRATION_V1 + 4
                : // GRID_DENSITY_MIGRATION_V1 used to adjust code as per new scaled canvas.
                    GRID_DENSITY_MIGRATION_V1;
            const isMultiLine = (widget.bottomRow - widget.topRow) / minInputSingleLineHeight > 1 &&
                widget.inputType === "TEXT";
            if (isMultiLine) {
                widget.inputType = "MULTI_LINE_TEXT";
            }
        }
    });
}
exports.migrateInputWidgetsMultiLineInputType = migrateInputWidgetsMultiLineInputType;
//# sourceMappingURL=075-migrate-input-widgets-multiline-input-type.js.map