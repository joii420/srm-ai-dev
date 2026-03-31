"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateChildStylesheetFromDynamicBindingPathList = void 0;
const utils_1 = require("../utils");
const migrateChildStylesheetFromDynamicBindingPathList = (currentDSL) => {
    const widgetsWithChildStylesheet = [
        "TABLE_WIDGET_V2",
        "BUTTON_GROUP_WIDGET",
        "JSON_FORM_WIDGET",
    ];
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (widgetsWithChildStylesheet.includes(widget.type) &&
            widget.childStylesheet) {
            const newPaths = widget.dynamicBindingPathList?.filter(({ key }) => !key.startsWith("childStylesheet."));
            widget.dynamicBindingPathList = newPaths;
        }
    });
};
exports.migrateChildStylesheetFromDynamicBindingPathList = migrateChildStylesheetFromDynamicBindingPathList;
//# sourceMappingURL=070-migrate-child-stylesheet-from-dynamic-binding-path-list.js.map