"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateAddShowHideDataPointLabels = void 0;
const utils_1 = require("../utils");
const migrateAddShowHideDataPointLabels = (currentDSL) => {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (widget.type == "CHART_WIDGET") {
            const chartWidgetProps = widget;
            chartWidgetProps.showDataPointLabel = chartWidgetProps.allowScroll;
        }
    });
};
exports.migrateAddShowHideDataPointLabels = migrateAddShowHideDataPointLabels;
//# sourceMappingURL=083-migrate-add-show-hide-data-point-labels.js.map