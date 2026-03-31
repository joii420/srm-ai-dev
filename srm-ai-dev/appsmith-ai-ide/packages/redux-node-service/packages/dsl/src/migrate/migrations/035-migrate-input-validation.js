"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateInputValidation = void 0;
const has_1 = __importDefault(require("lodash/has"));
const migrateInputValidation = (currentDSL) => {
    if (currentDSL.type === "INPUT_WIDGET") {
        if ((0, has_1.default)(currentDSL, "validation")) {
            // convert boolean to string expression
            if (typeof currentDSL.validation === "boolean") {
                currentDSL.validation = String(currentDSL.validation);
            }
            else if (typeof currentDSL.validation !== "string") {
                // for any other type of value set to default undefined
                currentDSL.validation = undefined;
            }
        }
    }
    if (currentDSL.children && currentDSL.children.length) {
        currentDSL.children = currentDSL.children.map((child) => (0, exports.migrateInputValidation)(child));
    }
    return currentDSL;
};
exports.migrateInputValidation = migrateInputValidation;
//# sourceMappingURL=035-migrate-input-validation.js.map