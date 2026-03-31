"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateChartwidgetCustomEchartConfig = void 0;
const utils_1 = require("../utils");
const migrateChartwidgetCustomEchartConfig = (currentDSL) => {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        const widgetName = widget.widgetName;
        const existingSuffix = `))(${widgetName}.chartType); }}`;
        const replacementSuffix = `))(${widgetName}.chartType) }}`;
        if (widget.type === "CHART_WIDGET" &&
            typeof widget.customEChartConfig === "string" &&
            widget.customEChartConfig.endsWith(existingSuffix)) {
            widget.customEChartConfig =
                widget.customEChartConfig.substring(0, widget.customEChartConfig.lastIndexOf(existingSuffix)) + replacementSuffix;
        }
    });
};
exports.migrateChartwidgetCustomEchartConfig = migrateChartwidgetCustomEchartConfig;
//# sourceMappingURL=087-migrate-chart-widget-customechartdata.js.map