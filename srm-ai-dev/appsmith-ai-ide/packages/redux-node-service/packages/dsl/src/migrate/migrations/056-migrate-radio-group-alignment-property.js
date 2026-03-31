"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateRadioGroupAlignmentProperty = void 0;
const migrateRadioGroupAlignmentProperty = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "RADIO_GROUP_WIDGET") {
            if (!child.hasOwnProperty("alignment")) {
                child.alignment = "left";
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateRadioGroupAlignmentProperty)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateRadioGroupAlignmentProperty = migrateRadioGroupAlignmentProperty;
//# sourceMappingURL=056-migrate-radio-group-alignment-property.js.map