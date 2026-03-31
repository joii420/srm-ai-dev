"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tabsWidgetTabsPropertyMigration = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const isString_1 = __importDefault(require("lodash/isString"));
const loglevel_1 = __importDefault(require("loglevel"));
const tabsWidgetTabsPropertyMigration = (currentDSL) => {
    currentDSL.children = currentDSL.children
        ?.filter(Boolean)
        .map((child) => {
        if (child.type === "TABS_WIDGET") {
            try {
                const tabs = (0, isString_1.default)(child.tabs)
                    ? JSON.parse(child.tabs)
                    : child.tabs;
                const newTabs = tabs.map((tab) => {
                    const childForTab = child.children
                        ?.filter(Boolean)
                        .find((tabChild) => tabChild.tabId === tab.id);
                    if (childForTab) {
                        tab.widgetId = childForTab.widgetId;
                    }
                    return tab;
                });
                child.tabs = JSON.stringify(newTabs);
            }
            catch (migrationError) {
                loglevel_1.default.debug({ migrationError });
            }
        }
        if (child.children && child.children.length) {
            child = (0, exports.tabsWidgetTabsPropertyMigration)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.tabsWidgetTabsPropertyMigration = tabsWidgetTabsPropertyMigration;
//# sourceMappingURL=005-tabs-widget-property-migration.js.map