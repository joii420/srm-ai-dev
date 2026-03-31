"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTableWidgetHeaderVisibilityProperties = void 0;
const migrateTableWidgetHeaderVisibilityProperties = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "TABLE_WIDGET") {
            if (!("isVisibleSearch" in child)) {
                child.isVisibleSearch = true;
                child.isVisibleFilters = true;
                child.isVisibleDownload = true;
                child.isVisiblePagination = true;
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateTableWidgetHeaderVisibilityProperties)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateTableWidgetHeaderVisibilityProperties = migrateTableWidgetHeaderVisibilityProperties;
//# sourceMappingURL=024-migrate-table-widget-header-visibility-properties.js.map