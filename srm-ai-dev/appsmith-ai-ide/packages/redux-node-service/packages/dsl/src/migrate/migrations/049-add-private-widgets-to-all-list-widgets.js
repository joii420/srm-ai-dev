"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPrivateWidgetsToAllListWidgets = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const set_1 = __importDefault(require("lodash/set"));
/**
 * adds 'privateWidgets' key for all list widgets
 *
 * @param currentDSL
 * @returns
 */
const addPrivateWidgetsToAllListWidgets = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "LIST_WIDGET") {
            const privateWidgets = {};
            Object.keys(child.template).forEach((entityName) => {
                privateWidgets[entityName] = true;
            });
            if (!child.privateWidgets) {
                (0, set_1.default)(child, `privateWidgets`, privateWidgets);
            }
        }
        return child;
    });
    return currentDSL;
};
exports.addPrivateWidgetsToAllListWidgets = addPrivateWidgetsToAllListWidgets;
//# sourceMappingURL=049-add-private-widgets-to-all-list-widgets.js.map