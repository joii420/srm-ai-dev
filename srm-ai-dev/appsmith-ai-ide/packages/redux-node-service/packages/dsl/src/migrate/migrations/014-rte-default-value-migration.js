"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rteDefaultValueMigration = void 0;
const rteDefaultValueMigration = (currentDSL) => {
    if (currentDSL.type === "RICH_TEXT_EDITOR_WIDGET") {
        currentDSL.inputType = "html";
    }
    currentDSL.children?.forEach((children) => (0, exports.rteDefaultValueMigration)(children));
    return currentDSL;
};
exports.rteDefaultValueMigration = rteDefaultValueMigration;
//# sourceMappingURL=014-rte-default-value-migration.js.map