"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateRateWidgetDisabledState = void 0;
const utils_1 = require("../utils");
// migrate all rate widgets with isDisabled = true to isReadOnly = true
function migrateRateWidgetDisabledState(currentDSL) {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "RATE_WIDGET") {
            // if isDisabled is true, set isReadOnly to true
            if (child.isDisabled === true) {
                child.isDisabled = false;
                child.isReadOnly = true;
            }
            else if (
            // if isDisabled is a dynamic value, set isReadOnly to the same dynamic value
            typeof child.isDisabled === "string" &&
                (0, utils_1.isDynamicValue)(child.isDisabled)) {
                child.isReadOnly = child.isDisabled;
                child.isDisabled = false;
                // add readonly to dynamic binding
                child.dynamicBindingPathList = [
                    ...(child.dynamicBindingPathList || []),
                    {
                        key: "isReadOnly",
                    },
                ];
                child.dynamicPropertyPathList = [
                    ...(child.dynamicPropertyPathList || []),
                    {
                        key: "isReadOnly",
                    },
                ];
                // remove readonly from dynamic binding
                child.dynamicBindingPathList = child.dynamicBindingPathList.filter((item) => item.key !== "isDisabled");
                child.dynamicPropertyPathList = child.dynamicPropertyPathList.filter((item) => item.key !== "isDisabled");
            }
        }
        else if (child.children && child.children.length > 0) {
            child = migrateRateWidgetDisabledState(child);
        }
        return child;
    });
    return currentDSL;
}
exports.migrateRateWidgetDisabledState = migrateRateWidgetDisabledState;
//# sourceMappingURL=064-migrate-rate-widget-disabed-state.js.map