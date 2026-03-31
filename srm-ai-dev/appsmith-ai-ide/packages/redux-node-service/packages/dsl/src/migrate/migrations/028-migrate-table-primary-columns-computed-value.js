"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTablePrimaryColumnsComputedValue = void 0;
const utils_1 = require("../utils");
const migrateTablePrimaryColumnsComputedValue = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "TABLE_WIDGET") {
            if (child.primaryColumns &&
                Object.keys(child.primaryColumns).length > 0) {
                const newPrimaryColumns = {};
                for (const [key, value] of Object.entries(child.primaryColumns)) {
                    const sanitizedKey = (0, utils_1.removeSpecialChars)(key, 200);
                    let newComputedValue = "";
                    if (value.computedValue) {
                        newComputedValue = value.computedValue.replace(`${child.widgetName}.sanitizedTableData.map((currentRow) => { return`, `${child.widgetName}.sanitizedTableData.map((currentRow) => (`);
                        // change matching "}" bracket with ")"
                        const lastParanthesesInd = newComputedValue.length - 4;
                        newComputedValue =
                            newComputedValue.substring(0, lastParanthesesInd) +
                                ")" +
                                newComputedValue.substring(lastParanthesesInd + 1);
                    }
                    newPrimaryColumns[sanitizedKey] = {
                        ...value,
                        computedValue: newComputedValue,
                    };
                }
                child.primaryColumns = newPrimaryColumns;
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateTablePrimaryColumnsComputedValue)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateTablePrimaryColumnsComputedValue = migrateTablePrimaryColumnsComputedValue;
//# sourceMappingURL=028-migrate-table-primary-columns-computed-value.js.map