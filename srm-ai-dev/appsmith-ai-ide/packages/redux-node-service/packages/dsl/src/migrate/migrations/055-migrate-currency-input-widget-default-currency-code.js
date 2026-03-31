"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateCurrencyInputWidgetDefaultCurrencyCode = void 0;
const migrateCurrencyInputWidgetDefaultCurrencyCode = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "CURRENCY_INPUT_WIDGET") {
            child.defaultCurrencyCode = child.currencyCode;
            delete child.currencyCode;
            if (child.dynamicPropertyPathList) {
                child.dynamicPropertyPathList.forEach((property) => {
                    if (property.key === "currencyCode") {
                        property.key = "defaultCurrencyCode";
                    }
                });
            }
            if (child.dynamicBindingPathList) {
                child.dynamicBindingPathList.forEach((property) => {
                    if (property.key === "currencyCode") {
                        property.key = "defaultCurrencyCode";
                    }
                });
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateCurrencyInputWidgetDefaultCurrencyCode)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateCurrencyInputWidgetDefaultCurrencyCode = migrateCurrencyInputWidgetDefaultCurrencyCode;
//# sourceMappingURL=055-migrate-currency-input-widget-default-currency-code.js.map