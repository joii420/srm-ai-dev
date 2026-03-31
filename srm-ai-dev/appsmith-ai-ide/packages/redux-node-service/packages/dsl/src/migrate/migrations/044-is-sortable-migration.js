"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSortableMigration = void 0;
const isSortableMigration = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "TABLE_WIDGET" && !child.hasOwnProperty("isSortable")) {
            child["isSortable"] = true;
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.isSortableMigration)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.isSortableMigration = isSortableMigration;
//# sourceMappingURL=044-is-sortable-migration.js.map