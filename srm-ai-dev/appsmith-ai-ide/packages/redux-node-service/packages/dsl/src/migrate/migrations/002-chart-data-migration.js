"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chartDataMigration = void 0;
const chartDataMigration = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((children) => {
        if (children.type === "CHART_WIDGET" &&
            children.chartData &&
            children.chartData.length &&
            !Array.isArray(children.chartData[0])) {
            children.chartData = [{ data: children.chartData }];
        }
        else if (children.type === "CONTAINER_WIDGET" ||
            children.type === "FORM_WIDGET" ||
            children.type === "CANVAS_WIDGET" ||
            children.type === "TABS_WIDGET") {
            children = (0, exports.chartDataMigration)(children);
        }
        return children;
    });
    return currentDSL;
};
exports.chartDataMigration = chartDataMigration;
//# sourceMappingURL=002-chart-data-migration.js.map