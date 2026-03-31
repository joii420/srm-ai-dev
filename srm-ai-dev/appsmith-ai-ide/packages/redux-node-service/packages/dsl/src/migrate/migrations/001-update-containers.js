"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateContainers = void 0;
const utils_1 = require("../utils");
const updateContainers = (dsl) => {
    if (dsl.type === "CONTAINER_WIDGET" || dsl.type === "FORM_WIDGET") {
        if (!(dsl.children &&
            dsl.children.length > 0 &&
            (dsl.children[0].type === "CANVAS_WIDGET" ||
                dsl.children[0].type === "FORM_WIDGET"))) {
            const canvas = {
                ...dsl,
                backgroundColor: "transparent",
                type: "CANVAS_WIDGET",
                detachFromLayout: true,
                topRow: 0,
                leftColumn: 0,
                rightColumn: dsl.parentColumnSpace * (dsl.rightColumn - dsl.leftColumn),
                bottomRow: dsl.parentRowSpace * (dsl.bottomRow - dsl.topRow),
                widgetName: (0, utils_1.generateReactKey)(),
                widgetId: (0, utils_1.generateReactKey)(),
                parentRowSpace: 1,
                parentColumnSpace: 1,
                containerStyle: "none",
                canExtend: false,
                isVisible: true,
            };
            delete canvas.dynamicBindings;
            delete canvas.dynamicProperties;
            if (canvas.children && canvas.children.length > 0)
                canvas.children = canvas.children.map(exports.updateContainers);
            dsl.children = [{ ...canvas }];
        }
    }
    return dsl;
};
exports.updateContainers = updateContainers;
//# sourceMappingURL=001-update-containers.js.map