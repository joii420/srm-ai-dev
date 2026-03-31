"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateListWidgetChildrenForAutoHeight = void 0;
function migrateListWidgetChildrenForAutoHeight(currentDSL, isChildOfListWidget = false) {
    if (!currentDSL)
        return currentDSL;
    let isCurrentListWidget = false;
    if (currentDSL.type === "LIST_WIDGET")
        isCurrentListWidget = true;
    //Iterate and recursively call each children
    const children = currentDSL.children?.map((childDSL) => migrateListWidgetChildrenForAutoHeight(childDSL, isCurrentListWidget || isChildOfListWidget));
    let newDSL;
    // Add dynamicHeight to FIXED for each of it's children
    if (isChildOfListWidget && !currentDSL.detachFromLayout) {
        newDSL = {
            ...currentDSL,
            dynamicHeight: "FIXED",
        };
    }
    else {
        newDSL = {
            ...currentDSL,
        };
    }
    if (children) {
        newDSL.children = children;
    }
    return newDSL;
}
exports.migrateListWidgetChildrenForAutoHeight = migrateListWidgetChildrenForAutoHeight;
//# sourceMappingURL=072-migrate-list-widget-children-for-auto-height.js.map