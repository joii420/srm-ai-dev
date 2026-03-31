"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateFilterValueForDropDownWidget = void 0;
const addFilterDefaultValue = (currentDSL) => {
    if (currentDSL.type === "DROP_DOWN_WIDGET") {
        if (!currentDSL.hasOwnProperty("isFilterable")) {
            currentDSL.isFilterable = true;
        }
    }
    return currentDSL;
};
const migrateFilterValueForDropDownWidget = (currentDSL) => {
    const newDSL = addFilterDefaultValue(currentDSL);
    newDSL.children = newDSL.children?.map((children) => {
        return (0, exports.migrateFilterValueForDropDownWidget)(children);
    });
    return newDSL;
};
exports.migrateFilterValueForDropDownWidget = migrateFilterValueForDropDownWidget;
//# sourceMappingURL=027-migrate-filter-value-for-dropdown-widget.js.map