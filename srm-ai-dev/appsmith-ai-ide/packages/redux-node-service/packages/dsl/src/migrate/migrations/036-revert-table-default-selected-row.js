"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revertTableDefaultSelectedRow = void 0;
const revertTableDefaultSelectedRow = (currentDSL) => {
    if (currentDSL.type === "TABLE_WIDGET") {
        if (currentDSL.version === 1 && currentDSL.defaultSelectedRow === "0")
            currentDSL.defaultSelectedRow = undefined;
        // update version to 3 for all table dsl
        currentDSL.version = 3;
    }
    if (currentDSL.children && currentDSL.children.length) {
        currentDSL.children = currentDSL.children.map((child) => (0, exports.revertTableDefaultSelectedRow)(child));
    }
    return currentDSL;
};
exports.revertTableDefaultSelectedRow = revertTableDefaultSelectedRow;
//# sourceMappingURL=036-revert-table-default-selected-row.js.map