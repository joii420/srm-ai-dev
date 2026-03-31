"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateModalIconButtonWidget = void 0;
const migrateModalIconButtonWidget = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "ICON_WIDGET") {
            child.type = "ICON_BUTTON_WIDGET";
            child.buttonColor = "#2E3D49"; // Colors.OXFORD_BLUE;
            child.buttonVariant = "TERTIARY";
            child.borderRadius = "SHARP";
            child.color = undefined;
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateModalIconButtonWidget)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateModalIconButtonWidget = migrateModalIconButtonWidget;
//# sourceMappingURL=052-migrate-modal-icon-button-widget.js.map