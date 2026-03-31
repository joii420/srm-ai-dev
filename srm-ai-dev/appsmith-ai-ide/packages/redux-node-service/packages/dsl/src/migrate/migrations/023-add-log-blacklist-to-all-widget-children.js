"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addLogBlackListToAllListWidgetChildren = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const lodash_1 = require("lodash");
const addLogBlackListToAllListWidgetChildren = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((children) => {
        if (children.type === "LIST_WIDGET") {
            const widgets = (0, lodash_1.get)(children, "children.0.children.0.children.0.children");
            widgets.map((widget, index) => {
                const logBlackList = {};
                Object.keys(widget).map((key) => {
                    logBlackList[key] = true;
                });
                if (!widget.logBlackList) {
                    (0, lodash_1.set)(children, `children.0.children.0.children.0.children.${index}.logBlackList`, logBlackList);
                }
            });
        }
        return children;
    });
    return currentDSL;
};
exports.addLogBlackListToAllListWidgetChildren = addLogBlackListToAllListWidgetChildren;
//# sourceMappingURL=023-add-log-blacklist-to-all-widget-children.js.map