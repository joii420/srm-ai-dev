"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migratePhoneInputWidgetAllowFormatting = void 0;
const migratePhoneInputWidgetAllowFormatting = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "PHONE_INPUT_WIDGET") {
            child.allowFormatting = true;
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migratePhoneInputWidgetAllowFormatting)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migratePhoneInputWidgetAllowFormatting = migratePhoneInputWidgetAllowFormatting;
//# sourceMappingURL=051-migrate-phone-input-widget-allow-formatting.js.map