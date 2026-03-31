"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicPathListMigration = void 0;
const dynamicPathListMigration = (currentDSL) => {
    if (currentDSL.children && currentDSL.children.length) {
        currentDSL.children = currentDSL.children.map(exports.dynamicPathListMigration);
    }
    if (currentDSL.dynamicBindings) {
        currentDSL.dynamicBindingPathList = Object.keys(currentDSL.dynamicBindings).map((path) => ({ key: path }));
        delete currentDSL.dynamicBindings;
    }
    if (currentDSL.dynamicTriggers) {
        currentDSL.dynamicTriggerPathList = Object.keys(currentDSL.dynamicTriggers).map((path) => ({ key: path }));
        delete currentDSL.dynamicTriggers;
    }
    if (currentDSL.dynamicProperties) {
        currentDSL.dynamicPropertyPathList = Object.keys(currentDSL.dynamicProperties).map((path) => ({ key: path }));
        delete currentDSL.dynamicProperties;
    }
    return currentDSL;
};
exports.dynamicPathListMigration = dynamicPathListMigration;
//# sourceMappingURL=006-dynamic-path-list-migration.js.map