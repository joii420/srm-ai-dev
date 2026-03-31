"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateItemsToListDataInListWidget = void 0;
const get_1 = __importDefault(require("lodash/get"));
const isString_1 = __importDefault(require("lodash/isString"));
const set_1 = __importDefault(require("lodash/set"));
const renameKeyInObject = (object, key, newKey) => {
    if (object[key]) {
        (0, set_1.default)(object, newKey, object[key]);
    }
    return object;
};
/**
 * changes items -> listData
 *
 * @param currentDSL
 * @returns
 */
const migrateItemsToListDataInListWidget = (currentDSL) => {
    if (currentDSL.type === "LIST_WIDGET") {
        currentDSL = renameKeyInObject(currentDSL, "items", "listData");
        currentDSL.dynamicBindingPathList = currentDSL.dynamicBindingPathList?.map((path) => {
            if (path.key === "items") {
                return { key: "listData" };
            }
            return path;
        });
        currentDSL.dynamicBindingPathList?.map((path) => {
            if ((0, get_1.default)(currentDSL, path.key) &&
                path.key !== "items" &&
                path.key !== "listData" &&
                (0, isString_1.default)((0, get_1.default)(currentDSL, path.key))) {
                (0, set_1.default)(currentDSL, path.key, (0, get_1.default)(currentDSL, path.key, "").replace("items", "listData"));
            }
        });
        Object.keys(currentDSL.template).map((widgetName) => {
            const currentWidget = currentDSL.template[widgetName];
            currentWidget.dynamicBindingPathList?.map((path) => {
                (0, set_1.default)(currentWidget, path.key, (0, get_1.default)(currentWidget, path.key).replace("items", "listData"));
            });
        });
    }
    if (currentDSL.children && currentDSL.children.length > 0) {
        currentDSL.children = currentDSL.children.map(exports.migrateItemsToListDataInListWidget);
    }
    return currentDSL;
};
exports.migrateItemsToListDataInListWidget = migrateItemsToListDataInListWidget;
//# sourceMappingURL=025-migrate-items-to-list-data-in-list-widget.js.map