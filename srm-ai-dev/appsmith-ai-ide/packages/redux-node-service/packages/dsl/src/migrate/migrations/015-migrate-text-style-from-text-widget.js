"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTextStyleFromTextWidget = void 0;
const migrateTextStyleFromTextWidget = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "TEXT_WIDGET") {
            const textStyle = child.textStyle;
            switch (textStyle) {
                case "HEADING":
                    child.fontSize = "HEADING1";
                    child.fontStyle = "BOLD";
                    break;
                case "BODY":
                    child.fontSize = "PARAGRAPH";
                    child.fontStyle = "";
                    break;
                case "LABEL":
                    child.fontSize = "PARAGRAPH";
                    child.fontStyle = "BOLD";
                    break;
                default:
                    break;
            }
            child.textColor = "#231F20";
            delete child.textStyle;
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateTextStyleFromTextWidget)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateTextStyleFromTextWidget = migrateTextStyleFromTextWidget;
//# sourceMappingURL=015-migrate-text-style-from-text-widget.js.map