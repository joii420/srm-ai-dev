"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateOldChartData = void 0;
const isString_1 = __importDefault(require("lodash/isString"));
const migrateOldChartData = (currentDSL) => {
    if (currentDSL.type === "CHART_WIDGET") {
        if ((0, isString_1.default)(currentDSL.chartData)) {
            try {
                currentDSL.chartData = JSON.parse(currentDSL.chartData);
            }
            catch (error) {
                // Sentry.captureException({
                //   message: "Chart Migration F`ailed",
                //   oldData: currentDSL.chartData,
                // });
                currentDSL.chartData = [];
            }
        }
    }
    if (currentDSL.children && currentDSL.children.length) {
        currentDSL.children = currentDSL.children.map(exports.migrateOldChartData);
    }
    return currentDSL;
};
exports.migrateOldChartData = migrateOldChartData;
//# sourceMappingURL=013-migrate-old-chart-data.js.map