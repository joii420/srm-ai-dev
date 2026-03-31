"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrateSelectTypeWidgetDefaultValue = void 0;
const utils_1 = require("../utils");
const getBindingTemplate = (widgetName) => {
    const prefixTemplate = `{{ ((options, serverSideFiltering) => ( `;
    const suffixTemplate = `))(${widgetName}.options, ${widgetName}.serverSideFiltering) }}`;
    return { prefixTemplate, suffixTemplate };
};
const SelectTypeWidgets = ["SELECT_WIDGET", "MULTI_SELECT_WIDGET_V2"];
function MigrateSelectTypeWidgetDefaultValue(currentDSL) {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (SelectTypeWidgets.includes(child.type)) {
            const defaultOptionValue = child.defaultOptionValue;
            const { prefixTemplate, suffixTemplate } = getBindingTemplate(child.widgetName);
            if (typeof defaultOptionValue === "string" &&
                (0, utils_1.isDynamicValue)(defaultOptionValue) &&
                !defaultOptionValue.endsWith(suffixTemplate) &&
                !defaultOptionValue.startsWith(prefixTemplate)) {
                child.defaultOptionValue = `${prefixTemplate}${(0, utils_1.stringToJS)(defaultOptionValue)}${suffixTemplate}`;
            }
        }
        else if (child.children && child.children.length > 0) {
            child = MigrateSelectTypeWidgetDefaultValue(child);
        }
        return child;
    });
    return currentDSL;
}
exports.MigrateSelectTypeWidgetDefaultValue = MigrateSelectTypeWidgetDefaultValue;
//# sourceMappingURL=062-migrate-select-type-widget-default-value.js.map