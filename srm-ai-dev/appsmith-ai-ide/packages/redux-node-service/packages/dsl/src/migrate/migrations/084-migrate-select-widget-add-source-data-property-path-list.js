"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateSelectWidgetAddSourceDataPropertyPathList = void 0;
const utils_1 = require("../utils");
/*
 * Migration to add sourceData to the dynamicPropertyPathList
 */
function migrateSelectWidgetAddSourceDataPropertyPathList(currentDSL) {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (["SELECT_WIDGET", "MULTI_SELECT_WIDGET_V2"].includes(widget.type)) {
            const dynamicPropertyPathList = widget.dynamicPropertyPathList;
            const sourceDataIndex = dynamicPropertyPathList
                ?.map((d) => d.key)
                .indexOf("sourceData");
            if (sourceDataIndex && sourceDataIndex === -1) {
                dynamicPropertyPathList?.push({
                    key: "sourceData",
                });
            }
            else if (!Array.isArray(dynamicPropertyPathList)) {
                widget.dynamicPropertyPathList = [
                    {
                        key: "sourceData",
                    },
                ];
            }
        }
    });
}
exports.migrateSelectWidgetAddSourceDataPropertyPathList = migrateSelectWidgetAddSourceDataPropertyPathList;
//# sourceMappingURL=084-migrate-select-widget-add-source-data-property-path-list.js.map