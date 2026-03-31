"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateChartDataFromArrayToObject = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const lodash_1 = require("lodash");
const utils_1 = require("../utils");
/**
 * changes chartData which we were using as array. now it will be a object
 *
 *
 * @param currentDSL
 * @returns
 */
const migrateChartDataFromArrayToObject = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((children) => {
        if (children.type === "CHART_WIDGET") {
            if (Array.isArray(children.chartData)) {
                const newChartData = {};
                const dynamicBindingPathList = children?.dynamicBindingPathList
                    ? children?.dynamicBindingPathList.slice()
                    : [];
                children.chartData.map((datum, index) => {
                    const generatedKey = (0, utils_1.generateReactKey)();
                    (0, lodash_1.set)(newChartData, `${generatedKey}`, datum);
                    if (Array.isArray(children.dynamicBindingPathList) &&
                        children.dynamicBindingPathList?.findIndex((path) => (path.key = `chartData[${index}].data`)) > -1) {
                        const foundIndex = children.dynamicBindingPathList.findIndex((path) => (path.key = `chartData[${index}].data`));
                        dynamicBindingPathList[foundIndex] = {
                            key: `chartData.${generatedKey}.data`,
                        };
                    }
                });
                children.dynamicBindingPathList = dynamicBindingPathList;
                children.chartData = newChartData;
            }
        }
        else if (children.type === "CONTAINER_WIDGET" ||
            children.type === "FORM_WIDGET" ||
            children.type === "CANVAS_WIDGET" ||
            children.type === "TABS_WIDGET") {
            children = (0, exports.migrateChartDataFromArrayToObject)(children);
        }
        return children;
    });
    return currentDSL;
};
exports.migrateChartDataFromArrayToObject = migrateChartDataFromArrayToObject;
//# sourceMappingURL=016-migrate-chart-data-from-array-to-object.js.map