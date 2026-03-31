"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.singleChartDataMigration = void 0;
const singleChartDataMigration = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "CHART_WIDGET") {
            // Check if chart widget has the deprecated singleChartData property
            if (child.hasOwnProperty("singleChartData")) {
                // This is to make sure that the format of the chartData is accurate
                if (Array.isArray(child.singleChartData) &&
                    !child.singleChartData[0].hasOwnProperty("seriesName")) {
                    child.singleChartData = {
                        seriesName: "Series 1",
                        data: child.singleChartData || [],
                    };
                }
                //TODO: other possibilities?
                child.chartData = JSON.stringify([...child.singleChartData]);
                delete child.singleChartData;
            }
        }
        if (child.children && child.children.length > 0) {
            child = (0, exports.singleChartDataMigration)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.singleChartDataMigration = singleChartDataMigration;
//# sourceMappingURL=004-single-chart-data-migration.js.map