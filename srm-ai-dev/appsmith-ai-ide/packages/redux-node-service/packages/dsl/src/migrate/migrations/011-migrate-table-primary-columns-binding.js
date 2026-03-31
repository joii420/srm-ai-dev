"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTablePrimaryColumnsBindings = void 0;
const utils_1 = require("../utils");
const migrateTablePrimaryColumnsBindings = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "TABLE_WIDGET") {
            if (child.primaryColumns &&
                Object.keys(child.primaryColumns).length > 0) {
                const newPrimaryColumns = {};
                for (const [key, value] of Object.entries(child.primaryColumns)) {
                    const sanitizedKey = (0, utils_1.removeSpecialChars)(key, 200);
                    const newComputedValue = value.computedValue
                        ? value.computedValue.replace(`${child.widgetName}.tableData.map`, `${child.widgetName}.sanitizedTableData.map`)
                        : "";
                    newPrimaryColumns[sanitizedKey] = {
                        ...value,
                        computedValue: newComputedValue,
                    };
                }
                child.primaryColumns = newPrimaryColumns;
                child.dynamicBindingPathList = child.dynamicBindingPathList?.map((path) => {
                    path.key = path.key.split(" ").join("_");
                    return path;
                });
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateTablePrimaryColumnsBindings)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateTablePrimaryColumnsBindings = migrateTablePrimaryColumnsBindings;
//# sourceMappingURL=011-migrate-table-primary-columns-binding.js.map