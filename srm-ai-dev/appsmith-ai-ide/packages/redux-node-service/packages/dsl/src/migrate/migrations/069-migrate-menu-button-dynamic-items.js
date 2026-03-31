"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateMenuButtonDynamicItems = void 0;
const utils_1 = require("../utils");
const migrateMenuButtonDynamicItems = (currentDSL) => {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (widget.type === "MENU_BUTTON_WIDGET" && !widget.menuItemsSource) {
            widget.menuItemsSource = "STATIC";
        }
    });
};
exports.migrateMenuButtonDynamicItems = migrateMenuButtonDynamicItems;
//# sourceMappingURL=069-migrate-menu-button-dynamic-items.js.map