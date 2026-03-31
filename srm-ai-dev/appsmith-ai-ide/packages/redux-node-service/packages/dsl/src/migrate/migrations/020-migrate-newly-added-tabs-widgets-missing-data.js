"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateNewlyAddedTabsWidgetsMissingData = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const has_1 = __importDefault(require("lodash/has"));
const migrateNewlyAddedTabsWidgetsMissingData = (currentDSL) => {
    if (currentDSL.type === "TABS_WIDGET" && currentDSL.version === 2) {
        try {
            if (currentDSL.children && currentDSL.children.length) {
                currentDSL.children = currentDSL.children.map((each) => {
                    if ((0, has_1.default)(currentDSL, ["leftColumn", "rightColumn", "bottomRow"])) {
                        return each;
                    }
                    return {
                        ...each,
                        leftColumn: 0,
                        rightColumn: (currentDSL.rightColumn - currentDSL.leftColumn) *
                            currentDSL.parentColumnSpace,
                        bottomRow: (currentDSL.bottomRow - currentDSL.topRow) *
                            currentDSL.parentRowSpace,
                    };
                });
            }
            currentDSL.version = 3;
        }
        catch (error) {
            //   Sentry.captureException({
            //     message: "Tabs Migration to add missing fields Failed",
            //     oldData: currentDSL.children,
            //   });
        }
    }
    if (currentDSL.children && currentDSL.children.length) {
        currentDSL.children = currentDSL.children.map(exports.migrateNewlyAddedTabsWidgetsMissingData);
    }
    return currentDSL;
};
exports.migrateNewlyAddedTabsWidgetsMissingData = migrateNewlyAddedTabsWidgetsMissingData;
//# sourceMappingURL=020-migrate-newly-added-tabs-widgets-missing-data.js.map