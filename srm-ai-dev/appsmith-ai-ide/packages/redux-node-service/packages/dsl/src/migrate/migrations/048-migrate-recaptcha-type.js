"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateRecaptchaType = void 0;
const migrateRecaptchaType = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "BUTTON_WIDGET" || child.type === "FORM_BUTTON_WIDGET") {
            const recaptchaV2 = child.recaptchaV2;
            if (recaptchaV2) {
                child.recaptchaType = "V2";
            }
            else {
                child.recaptchaType = "V3";
            }
            delete child.recaptchaV2;
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateRecaptchaType)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateRecaptchaType = migrateRecaptchaType;
//# sourceMappingURL=048-migrate-recaptcha-type.js.map