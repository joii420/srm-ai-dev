"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addVersionNumberMigration = void 0;
const addVersionNumberMigration = (currentDSL) => {
    if (currentDSL.children && currentDSL.children.length) {
        currentDSL.children = currentDSL.children.map(exports.addVersionNumberMigration);
    }
    if (currentDSL.version === undefined) {
        currentDSL.version = 1;
    }
    return currentDSL;
};
exports.addVersionNumberMigration = addVersionNumberMigration;
//# sourceMappingURL=010-add-version-number-migration.js.map