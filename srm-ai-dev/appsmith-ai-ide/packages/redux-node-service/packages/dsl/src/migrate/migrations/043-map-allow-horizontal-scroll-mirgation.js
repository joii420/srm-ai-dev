"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapAllowHorizontalScrollMigration = void 0;
const mapAllowHorizontalScrollMigration = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "CHART_WIDGET") {
            child.allowScroll = child.allowHorizontalScroll;
            delete child.allowHorizontalScroll;
        }
        if (Array.isArray(child.children) && child.children.length > 0)
            child = (0, exports.mapAllowHorizontalScrollMigration)(child);
        return child;
    });
    return currentDSL;
};
exports.mapAllowHorizontalScrollMigration = mapAllowHorizontalScrollMigration;
//# sourceMappingURL=043-map-allow-horizontal-scroll-mirgation.js.map