"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateLabelPosition = void 0;
const utils_1 = require("../utils");
function migrateLabelPosition(currentDSL) {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if ((widget.type === "PHONE_INPUT_WIDGET" ||
            widget.type === "CURRENCY_INPUT_WIDGET") &&
            widget.labelPosition === undefined) {
            widget.labelPosition = "Left";
        }
    });
}
exports.migrateLabelPosition = migrateLabelPosition;
//# sourceMappingURL=067-migrate-label-position.js.map