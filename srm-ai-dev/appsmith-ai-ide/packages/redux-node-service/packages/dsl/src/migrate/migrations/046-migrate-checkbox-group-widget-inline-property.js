"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateCheckboxGroupWidgetInlineProperty = void 0;
const migrateCheckboxGroupWidgetInlineProperty = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "CHECKBOX_GROUP_WIDGET") {
            if (child.version === 1) {
                child.isInline = true;
                child.version = 2;
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateCheckboxGroupWidgetInlineProperty)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateCheckboxGroupWidgetInlineProperty = migrateCheckboxGroupWidgetInlineProperty;
//# sourceMappingURL=046-migrate-checkbox-group-widget-inline-property.js.map