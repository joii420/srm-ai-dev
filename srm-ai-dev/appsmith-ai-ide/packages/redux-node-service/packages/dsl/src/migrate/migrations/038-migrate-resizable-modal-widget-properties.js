"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateResizableModalWidgetProperties = void 0;
const DEFAULT_GRID_ROW_HEIGHT = 10;
const migrateResizableModalWidgetProperties = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "MODAL_WIDGET" && child.version === 1) {
            const size = child.size;
            switch (size) {
                case "MODAL_SMALL":
                    child.width = 456;
                    child.height = DEFAULT_GRID_ROW_HEIGHT * 24;
                    break;
                case "MODAL_LARGE":
                    child.width = 532;
                    child.height = DEFAULT_GRID_ROW_HEIGHT * 60;
                    break;
                default:
                    child.width = 456;
                    child.height = DEFAULT_GRID_ROW_HEIGHT * 24;
                    break;
            }
            child.version = 2;
            delete child.size;
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateResizableModalWidgetProperties)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateResizableModalWidgetProperties = migrateResizableModalWidgetProperties;
//# sourceMappingURL=038-migrate-resizable-modal-widget-properties.js.map