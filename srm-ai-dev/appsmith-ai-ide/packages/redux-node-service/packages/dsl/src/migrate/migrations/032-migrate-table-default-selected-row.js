"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTableDefaultSelectedRow = void 0;
const migrateTableDefaultSelectedRow = (currentDSL) => {
    if (currentDSL.type === "TABLE_WIDGET") {
        if (!currentDSL.defaultSelectedRow)
            currentDSL.defaultSelectedRow = "0";
    }
    if (currentDSL.children && currentDSL.children.length) {
        currentDSL.children = currentDSL.children.map((child) => (0, exports.migrateTableDefaultSelectedRow)(child));
    }
    return currentDSL;
};
exports.migrateTableDefaultSelectedRow = migrateTableDefaultSelectedRow;
//# sourceMappingURL=032-migrate-table-default-selected-row.js.map