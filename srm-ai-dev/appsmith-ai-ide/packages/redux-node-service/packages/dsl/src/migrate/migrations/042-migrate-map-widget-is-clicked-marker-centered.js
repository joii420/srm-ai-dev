"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateMapWidgetIsClickedMarkerCentered = void 0;
const migrateMapWidgetIsClickedMarkerCentered = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "MAP_WIDGET") {
            if (!("isClickedMarkerCentered" in child)) {
                child.isClickedMarkerCentered = true;
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateMapWidgetIsClickedMarkerCentered)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateMapWidgetIsClickedMarkerCentered = migrateMapWidgetIsClickedMarkerCentered;
//# sourceMappingURL=042-migrate-map-widget-is-clicked-marker-centered.js.map