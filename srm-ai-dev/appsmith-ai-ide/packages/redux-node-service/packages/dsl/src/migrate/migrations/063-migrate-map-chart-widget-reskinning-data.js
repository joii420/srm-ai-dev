"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateMapChartWidgetReskinningData = void 0;
const migrateMapChartWidgetReskinningData = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "MAP_CHART_WIDGET") {
            if (!child.hasOwnProperty("fontFamily")) {
                child.fontFamily = "{{appsmith.theme.fontFamily.appFont}}";
                child.dynamicBindingPathList = [
                    ...(child.dynamicBindingPathList || []),
                    {
                        key: "fontFamily",
                    },
                ];
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateMapChartWidgetReskinningData)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateMapChartWidgetReskinningData = migrateMapChartWidgetReskinningData;
//# sourceMappingURL=063-migrate-map-chart-widget-reskinning-data.js.map