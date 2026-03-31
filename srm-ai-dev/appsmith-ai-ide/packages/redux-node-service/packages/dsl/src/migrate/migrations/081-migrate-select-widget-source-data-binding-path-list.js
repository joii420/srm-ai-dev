"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateSelectWidgetSourceDataBindingPathList = void 0;
const utils_1 = require("../utils");
/*
 * Migration to remove the options from dynamicBindingPathList and replace it with
 * sourceData
 */
function migrateSelectWidgetSourceDataBindingPathList(currentDSL) {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (["SELECT_WIDGET", "MULTI_SELECT_WIDGET_V2"].includes(widget.type)) {
            const dynamicBindingPathList = widget.dynamicBindingPathList;
            const optionsIndex = dynamicBindingPathList
                ?.map((d) => d.key)
                .indexOf("options");
            if (optionsIndex && optionsIndex > -1) {
                dynamicBindingPathList?.splice(optionsIndex, 1, {
                    key: "sourceData",
                });
            }
        }
    });
}
exports.migrateSelectWidgetSourceDataBindingPathList = migrateSelectWidgetSourceDataBindingPathList;
//# sourceMappingURL=081-migrate-select-widget-source-data-binding-path-list.js.map