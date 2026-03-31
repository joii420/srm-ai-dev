"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migratePhoneInputWidgetDefaultDialCode = void 0;
const migratePhoneInputWidgetDefaultDialCode = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "PHONE_INPUT_WIDGET") {
            child.defaultDialCode = child.dialCode;
            delete child.dialCode;
            if (child.dynamicPropertyPathList) {
                child.dynamicPropertyPathList.forEach((property) => {
                    if (property.key === "dialCode") {
                        property.key = "defaultDialCode";
                    }
                });
            }
            if (child.dynamicBindingPathList) {
                child.dynamicBindingPathList.forEach((property) => {
                    if (property.key === "dialCode") {
                        property.key = "defaultDialCode";
                    }
                });
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migratePhoneInputWidgetDefaultDialCode)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migratePhoneInputWidgetDefaultDialCode = migratePhoneInputWidgetDefaultDialCode;
//# sourceMappingURL=054-migrate-phone-input-widget-default-dial-code.js.map