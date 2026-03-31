"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revertButtonStyleToButtonColor = exports.ButtonStyleTypes = void 0;
var ButtonStyleTypes;
(function (ButtonStyleTypes) {
    ButtonStyleTypes["PRIMARY"] = "PRIMARY";
    ButtonStyleTypes["WARNING"] = "WARNING";
    ButtonStyleTypes["DANGER"] = "DANGER";
    ButtonStyleTypes["INFO"] = "INFO";
    ButtonStyleTypes["SECONDARY"] = "SECONDARY";
    ButtonStyleTypes["CUSTOM"] = "CUSTOM";
})(ButtonStyleTypes = exports.ButtonStyleTypes || (exports.ButtonStyleTypes = {}));
const Colors = {
    DANGER_SOLID: "#F22B2B",
    GREEN: "#03B365",
    WARNING_SOLID: "#FEB811",
    INFO_SOLID: "#6698FF",
    GRAY: "#858282",
};
const revertButtonStyleToButtonColor = (currentDSL) => {
    if (currentDSL.type === "BUTTON_WIDGET" ||
        currentDSL.type === "FORM_BUTTON_WIDGET" ||
        currentDSL.type === "ICON_BUTTON_WIDGET") {
        if (currentDSL.hasOwnProperty("buttonStyle")) {
            switch (currentDSL.buttonStyle) {
                case ButtonStyleTypes.DANGER:
                    currentDSL.buttonColor = Colors.DANGER_SOLID;
                    break;
                case ButtonStyleTypes.PRIMARY:
                    currentDSL.buttonColor = Colors.GREEN;
                    break;
                case ButtonStyleTypes.WARNING:
                    currentDSL.buttonColor = Colors.WARNING_SOLID;
                    break;
                case ButtonStyleTypes.INFO:
                    currentDSL.buttonColor = Colors.INFO_SOLID;
                    break;
                case ButtonStyleTypes.SECONDARY:
                    currentDSL.buttonColor = Colors.GRAY;
                    break;
                case "PRIMARY_BUTTON":
                    currentDSL.buttonColor = Colors.GREEN;
                    break;
                case "SECONDARY_BUTTON":
                    currentDSL.buttonColor = Colors.GREEN;
                    currentDSL.buttonVariant = "SECONDARY";
                    break;
                case "DANGER_BUTTON":
                    currentDSL.buttonColor = Colors.DANGER_SOLID;
                    break;
                default:
                    if (!currentDSL.buttonColor)
                        currentDSL.buttonColor = Colors.GREEN;
                    break;
            }
            delete currentDSL.buttonStyle;
        }
    }
    if (currentDSL.type === "MENU_BUTTON_WIDGET") {
        if (currentDSL.hasOwnProperty("menuStyle")) {
            switch (currentDSL.menuStyle) {
                case ButtonStyleTypes.DANGER:
                    currentDSL.menuColor = Colors.DANGER_SOLID;
                    break;
                case ButtonStyleTypes.PRIMARY:
                    currentDSL.menuColor = Colors.GREEN;
                    break;
                case ButtonStyleTypes.WARNING:
                    currentDSL.menuColor = Colors.WARNING_SOLID;
                    break;
                case ButtonStyleTypes.INFO:
                    currentDSL.menuColor = Colors.INFO_SOLID;
                    break;
                case ButtonStyleTypes.SECONDARY:
                    currentDSL.menuColor = Colors.GRAY;
                    break;
                default:
                    if (!currentDSL.menuColor)
                        currentDSL.menuColor = Colors.GREEN;
                    break;
            }
            delete currentDSL.menuStyle;
            delete currentDSL.prevMenuStyle;
        }
    }
    if (currentDSL.type === "TABLE_WIDGET") {
        if (currentDSL.hasOwnProperty("primaryColumns")) {
            Object.keys(currentDSL.primaryColumns).forEach((column) => {
                if (currentDSL.primaryColumns[column].columnType === "button") {
                    currentDSL.primaryColumns[column].buttonColor =
                        currentDSL.primaryColumns[column].buttonStyle;
                    delete currentDSL.primaryColumns[column].buttonStyle;
                }
            });
        }
    }
    if (currentDSL.children && currentDSL.children.length) {
        currentDSL.children = currentDSL.children.map((child) => (0, exports.revertButtonStyleToButtonColor)(child));
    }
    return currentDSL;
};
exports.revertButtonStyleToButtonColor = revertButtonStyleToButtonColor;
//# sourceMappingURL=040-revert-button-style-to-button-color.js.map