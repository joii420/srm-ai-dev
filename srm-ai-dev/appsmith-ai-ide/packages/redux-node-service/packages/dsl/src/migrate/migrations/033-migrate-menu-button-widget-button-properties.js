"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateMenuButtonWidgetButtonProperties = void 0;
const migrateMenuButtonWidgetButtonProperties = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "MENU_BUTTON_WIDGET") {
            if (!("menuStyle" in child)) {
                child.menuStyle = "PRIMARY";
                child.menuVariant = "SOLID";
                child.isVisible = true;
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateMenuButtonWidgetButtonProperties)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateMenuButtonWidgetButtonProperties = migrateMenuButtonWidgetButtonProperties;
//# sourceMappingURL=033-migrate-menu-button-widget-button-properties.js.map