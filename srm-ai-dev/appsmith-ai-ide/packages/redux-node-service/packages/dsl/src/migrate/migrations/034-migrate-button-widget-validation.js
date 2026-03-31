"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateButtonWidgetValidation = void 0;
const has_1 = __importDefault(require("lodash/has"));
const migrateButtonWidgetValidation = (currentDSL) => {
    if (currentDSL.type === "INPUT_WIDGET") {
        if (!(0, has_1.default)(currentDSL, "validation")) {
            currentDSL.validation = true;
        }
    }
    if (currentDSL.children && currentDSL.children.length) {
        currentDSL.children.map((eachWidgetDSL) => {
            (0, exports.migrateButtonWidgetValidation)(eachWidgetDSL);
        });
    }
    return currentDSL;
};
exports.migrateButtonWidgetValidation = migrateButtonWidgetValidation;
//# sourceMappingURL=034-migrate-button-widget-validation.js.map