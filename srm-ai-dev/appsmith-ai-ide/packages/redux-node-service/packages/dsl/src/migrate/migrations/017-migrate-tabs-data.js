"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTabsData = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const lodash_1 = require("lodash");
const utils_1 = require("../utils");
function migrateTabsDataUsingMigrator(currentDSL) {
    if (currentDSL.type === "TABS_WIDGET" && currentDSL.version === 1) {
        try {
            currentDSL.type = "TABS_MIGRATOR_WIDGET";
            currentDSL.version = 1;
        }
        catch (error) {
            // Sentry.captureException({
            //   message: "Tabs Migration Failed",
            //   oldData: currentDSL.tabs,
            // });
            currentDSL.tabsObj = {};
            delete currentDSL.tabs;
        }
    }
    if (currentDSL.children && currentDSL.children.length) {
        currentDSL.children = currentDSL.children.map(migrateTabsDataUsingMigrator);
    }
    return currentDSL;
}
const migrateTabsData = (currentDSL) => {
    if (["TABS_WIDGET", "TABS_MIGRATOR_WIDGET"].includes(currentDSL.type) &&
        currentDSL.version === 1) {
        try {
            currentDSL.type = "TABS_WIDGET";
            const isTabsDataBinded = (0, lodash_1.isString)(currentDSL.tabs);
            currentDSL.dynamicPropertyPathList =
                currentDSL.dynamicPropertyPathList || [];
            currentDSL.dynamicBindingPathList =
                currentDSL.dynamicBindingPathList || [];
            if (isTabsDataBinded) {
                const tabsString = currentDSL.tabs.replace(utils_1.DATA_BIND_REGEX_GLOBAL, (word) => `"${word}"`);
                try {
                    currentDSL.tabs = JSON.parse(tabsString);
                }
                catch (error) {
                    return migrateTabsDataUsingMigrator(currentDSL);
                }
                const dynamicPropsList = currentDSL.tabs
                    .filter((each) => utils_1.DATA_BIND_REGEX_GLOBAL.test(each.isVisible))
                    .map((each) => {
                    return { key: `tabsObj.${each.id}.isVisible` };
                });
                const dynamicBindablePropsList = currentDSL.tabs.map((each) => {
                    return { key: `tabsObj.${each.id}.isVisible` };
                });
                currentDSL.dynamicPropertyPathList = [
                    ...currentDSL.dynamicPropertyPathList,
                    ...dynamicPropsList,
                ];
                currentDSL.dynamicBindingPathList = [
                    ...currentDSL.dynamicBindingPathList,
                    ...dynamicBindablePropsList,
                ];
            }
            currentDSL.dynamicPropertyPathList =
                currentDSL.dynamicPropertyPathList.filter((each) => {
                    return each.key !== "tabs";
                });
            currentDSL.dynamicBindingPathList =
                currentDSL.dynamicBindingPathList.filter((each) => {
                    return each.key !== "tabs";
                });
            currentDSL.tabsObj = currentDSL.tabs.reduce((obj, tab, index) => {
                obj = {
                    ...obj,
                    [tab.id]: {
                        ...tab,
                        isVisible: tab.isVisible === undefined ? true : tab.isVisible,
                        index,
                    },
                };
                return obj;
            }, {});
            currentDSL.version = 2;
            delete currentDSL.tabs;
        }
        catch (error) {
            //   Sentry.captureException({
            //     message: "Tabs Migration Failed",
            //     oldData: currentDSL.tabs,
            //   });
            currentDSL.tabsObj = {};
            delete currentDSL.tabs;
        }
    }
    if (currentDSL.children && currentDSL.children.length) {
        currentDSL.children = currentDSL.children.map(exports.migrateTabsData);
    }
    return currentDSL;
};
exports.migrateTabsData = migrateTabsData;
//# sourceMappingURL=017-migrate-tabs-data.js.map