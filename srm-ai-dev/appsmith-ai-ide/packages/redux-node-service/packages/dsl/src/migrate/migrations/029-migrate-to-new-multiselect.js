"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToNewMultiSelect = void 0;
const migrateToNewMultiSelect = (currentDSL) => {
    if (currentDSL.type === "DROP_DOWN_WIDGET") {
        if (currentDSL.selectionType === "MULTI_SELECT") {
            currentDSL.type = "MULTI_SELECT_WIDGET";
            delete currentDSL.isFilterable;
        }
        delete currentDSL.selectionType;
    }
    if (currentDSL.children && currentDSL.children.length) {
        currentDSL.children = currentDSL.children.map((child) => (0, exports.migrateToNewMultiSelect)(child));
    }
    return currentDSL;
};
exports.migrateToNewMultiSelect = migrateToNewMultiSelect;
//# sourceMappingURL=029-migrate-to-new-multiselect.js.map