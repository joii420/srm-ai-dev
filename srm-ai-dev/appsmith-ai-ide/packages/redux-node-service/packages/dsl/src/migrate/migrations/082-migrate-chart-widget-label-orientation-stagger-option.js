"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateChartWidgetLabelOrientationStaggerOption = void 0;
const utils_1 = require("../utils");
const migrateChartWidgetLabelOrientationStaggerOption = (currentDSL) => {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (widget.type == "CHART_WIDGET") {
            const chartWidgetProps = widget;
            if (chartWidgetProps.labelOrientation == "stagger") {
                chartWidgetProps.labelOrientation = "auto";
            }
        }
    });
};
exports.migrateChartWidgetLabelOrientationStaggerOption = migrateChartWidgetLabelOrientationStaggerOption;
//# sourceMappingURL=082-migrate-chart-widget-label-orientation-stagger-option.js.map