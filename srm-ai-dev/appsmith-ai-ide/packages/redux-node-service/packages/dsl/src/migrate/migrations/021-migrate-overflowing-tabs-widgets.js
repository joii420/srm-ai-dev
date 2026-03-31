"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateOverFlowingTabsWidgets = exports.migrateWidgetsWithoutLeftRightColumns = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const lodash_1 = require("lodash");
const MAIN_CONTAINER_WIDGET_ID = "0";
/**
 * this function gets the next available row for pasting widgets
 * NOTE: this function excludes modal widget when calculating next available row
 *
 * @param parentContainerId
 * @param canvasWidgets
 * @returns
 */
const nextAvailableRowInContainer = (parentContainerId, canvasWidgets) => {
    const filteredCanvasWidgets = (0, lodash_1.omitBy)(canvasWidgets, (widget) => {
        return widget.type === "MODAL_WIDGET" || widget.type === "DRAWER_WIDGET";
    });
    return (Object.values(filteredCanvasWidgets).reduce((prev, next) => next?.parentId === parentContainerId && next.bottomRow > prev
        ? next.bottomRow
        : prev, 0) + 1);
};
const migrateWidgetsWithoutLeftRightColumns = (currentDSL, canvasWidgets) => {
    if (currentDSL.widgetId !== MAIN_CONTAINER_WIDGET_ID &&
        !(currentDSL.hasOwnProperty("leftColumn") &&
            currentDSL.hasOwnProperty("rightColumn"))) {
        try {
            const nextRow = nextAvailableRowInContainer(currentDSL.parentId || MAIN_CONTAINER_WIDGET_ID, (0, lodash_1.omit)(canvasWidgets, [currentDSL.widgetId]));
            canvasWidgets[currentDSL.widgetId].repositioned = true;
            const leftColumn = 0;
            // TODO(abhinav): Figure out a way to get the correct values from the widgets
            const rightColumn = 4;
            const bottomRow = nextRow + (currentDSL.bottomRow - currentDSL.topRow);
            const topRow = nextRow;
            currentDSL = {
                ...currentDSL,
                topRow,
                bottomRow,
                rightColumn,
                leftColumn,
            };
        }
        catch (error) {
            // Sentry.captureException({
            //   message: "Migrating position of widget on data loss failed",
            //   oldData: currentDSL,
            // });
        }
    }
    if (currentDSL.children && currentDSL.children.length) {
        currentDSL.children = currentDSL.children.map((dsl) => (0, exports.migrateWidgetsWithoutLeftRightColumns)(dsl, canvasWidgets));
    }
    return currentDSL;
};
exports.migrateWidgetsWithoutLeftRightColumns = migrateWidgetsWithoutLeftRightColumns;
const migrateOverFlowingTabsWidgets = (currentDSL, canvasWidgets) => {
    if (currentDSL.type === "TABS_WIDGET" &&
        currentDSL.version === 3 &&
        currentDSL.children &&
        currentDSL.children.length) {
        const tabsWidgetHeight = (currentDSL.bottomRow - currentDSL.topRow) * currentDSL.parentRowSpace;
        const widgetHasOverflowingChildren = currentDSL.children.some((eachTab) => {
            if (eachTab.children && eachTab.children.length) {
                return eachTab.children.some((child) => {
                    if (canvasWidgets[child.widgetId].repositioned) {
                        const tabHeight = child.bottomRow * child.parentRowSpace;
                        return tabsWidgetHeight < tabHeight;
                    }
                    return false;
                });
            }
            return false;
        });
        if (widgetHasOverflowingChildren) {
            currentDSL.shouldScrollContents = true;
        }
    }
    if (currentDSL.children && currentDSL.children.length) {
        currentDSL.children = currentDSL.children.map((eachChild) => (0, exports.migrateOverFlowingTabsWidgets)(eachChild, canvasWidgets));
    }
    return currentDSL;
};
exports.migrateOverFlowingTabsWidgets = migrateOverFlowingTabsWidgets;
//# sourceMappingURL=021-migrate-overflowing-tabs-widgets.js.map