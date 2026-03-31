"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateChartWidgetReskinningData = void 0;
const migrateChartWidgetReskinningData = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "CHART_WIDGET") {
            if (!(child.hasOwnProperty("accentColor") &&
                child.hasOwnProperty("fontFamily"))) {
                child.accentColor = "{{appsmith.theme.colors.primaryColor}}";
                child.fontFamily = "{{appsmith.theme.fontFamily.appFont}}";
                child.dynamicBindingPathList = [
                    ...(child.dynamicBindingPathList || []),
                    {
                        key: "accentColor",
                    },
                    {
                        key: "fontFamily",
                    },
                ];
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateChartWidgetReskinningData)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateChartWidgetReskinningData = migrateChartWidgetReskinningData;
//# sourceMappingURL=059-migrate-chart-widget-reskinning-data.js.map