"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canvasNameConflictMigration = void 0;
const canvasNameConflictMigration = (currentDSL, props = { counter: 1 }) => {
    if (currentDSL.type === "CANVAS_WIDGET" &&
        currentDSL.widgetName.startsWith("Canvas")) {
        currentDSL.widgetName = `Canvas${props.counter}`;
        // Canvases inside tabs have `name` property as well
        if (currentDSL.name) {
            currentDSL.name = currentDSL.widgetName;
        }
        props.counter++;
    }
    currentDSL.children?.forEach((c) => (0, exports.canvasNameConflictMigration)(c, props));
    return currentDSL;
};
exports.canvasNameConflictMigration = canvasNameConflictMigration;
//# sourceMappingURL=007-canvas-name-conflict-migration.js.map