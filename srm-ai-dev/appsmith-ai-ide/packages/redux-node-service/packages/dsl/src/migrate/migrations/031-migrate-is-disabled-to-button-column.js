"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateIsDisabledToButtonColumn = void 0;
const isEmpty_1 = __importDefault(require("lodash/isEmpty"));
const addIsDisabledToButtonColumn = (currentDSL) => {
    if (currentDSL.type === "TABLE_WIDGET") {
        if (!(0, isEmpty_1.default)(currentDSL.primaryColumns)) {
            for (const key of Object.keys(currentDSL.primaryColumns)) {
                if (currentDSL.primaryColumns[key].columnType === "button") {
                    if (!currentDSL.primaryColumns[key].hasOwnProperty("isDisabled")) {
                        currentDSL.primaryColumns[key]["isDisabled"] = false;
                    }
                }
                if (!currentDSL.primaryColumns[key].hasOwnProperty("isCellVisible")) {
                    currentDSL.primaryColumns[key]["isCellVisible"] = true;
                }
            }
        }
    }
    return currentDSL;
};
const migrateIsDisabledToButtonColumn = (currentDSL) => {
    const newDSL = addIsDisabledToButtonColumn(currentDSL);
    newDSL.children = newDSL.children?.map((children) => {
        return (0, exports.migrateIsDisabledToButtonColumn)(children);
    });
    return currentDSL;
};
exports.migrateIsDisabledToButtonColumn = migrateIsDisabledToButtonColumn;
//# sourceMappingURL=031-migrate-is-disabled-to-button-column.js.map