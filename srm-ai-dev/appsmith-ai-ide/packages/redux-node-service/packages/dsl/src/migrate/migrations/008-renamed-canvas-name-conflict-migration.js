"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renamedCanvasNameConflictMigration = void 0;
const _007_canvas_name_conflict_migration_1 = require("./007-canvas-name-conflict-migration");
const renamedCanvasNameConflictMigration = (currentDSL, props = { counter: 1 }) => {
    // Rename all canvas widgets except for MainContainer
    if (currentDSL.type === "CANVAS_WIDGET" &&
        currentDSL.widgetName !== "MainContainer") {
        currentDSL.widgetName = `Canvas${props.counter}`;
        // Canvases inside tabs have `name` property as well
        if (currentDSL.name) {
            currentDSL.name = currentDSL.widgetName;
        }
        props.counter++;
    }
    currentDSL.children?.forEach((c) => (0, _007_canvas_name_conflict_migration_1.canvasNameConflictMigration)(c, props));
    return currentDSL;
};
exports.renamedCanvasNameConflictMigration = renamedCanvasNameConflictMigration;
//# sourceMappingURL=008-renamed-canvas-name-conflict-migration.js.map