"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapDataMigration = void 0;
const mapDataMigration = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((children) => {
        if (children.type === "MAP_WIDGET") {
            if (children.markers) {
                children.markers = children.markers.map((marker) => {
                    return {
                        lat: marker.lat,
                        long: marker.lng || marker.long,
                        title: marker.title,
                    };
                });
            }
            if (children.defaultMarkers) {
                const defaultMarkers = JSON.parse(children.defaultMarkers);
                children.defaultMarkers = defaultMarkers.map((marker) => {
                    return {
                        lat: marker.lat,
                        long: marker.lng || marker.long,
                        title: marker.title,
                    };
                });
            }
            if (children.selectedMarker) {
                children.selectedMarker = {
                    lat: children.selectedMarker.lat,
                    long: children.selectedMarker.lng || children.selectedMarker.long,
                    title: children.selectedMarker.title,
                };
            }
            if (children.mapCenter) {
                children.mapCenter = {
                    lat: children.mapCenter.lat,
                    long: children.mapCenter.lng || children.mapCenter.long,
                    title: children.mapCenter.title,
                };
            }
            if (children.center) {
                children.center = {
                    lat: children.center.lat,
                    long: children.center.lng || children.center.long,
                    title: children.center.title,
                };
            }
        }
        else if (children.children && children.children.length > 0) {
            children = (0, exports.mapDataMigration)(children);
        }
        return children;
    });
    return currentDSL;
};
exports.mapDataMigration = mapDataMigration;
//# sourceMappingURL=003-map-data-migration.js.map