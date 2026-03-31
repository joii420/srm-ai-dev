"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateCheckboxSwitchProperty = exports.LabelPosition = exports.AlignWidgetTypes = void 0;
var AlignWidgetTypes;
(function (AlignWidgetTypes) {
    AlignWidgetTypes["LEFT"] = "LEFT";
    AlignWidgetTypes["RIGHT"] = "RIGHT";
})(AlignWidgetTypes = exports.AlignWidgetTypes || (exports.AlignWidgetTypes = {}));
var LabelPosition;
(function (LabelPosition) {
    LabelPosition["Left"] = "Left";
    LabelPosition["Right"] = "Right";
})(LabelPosition = exports.LabelPosition || (exports.LabelPosition = {}));
const migrateCheckboxSwitchProperty = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "SWITCH_WIDGET" || child.type === "CHECKBOX_WIDGET") {
            if (child.alignWidget === "RIGHT") {
                child.alignWidget = AlignWidgetTypes.RIGHT;
                child.labelPosition = LabelPosition.Left;
            }
            else {
                child.alignWidget = AlignWidgetTypes.LEFT;
                child.labelPosition = LabelPosition.Right;
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateCheckboxSwitchProperty)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateCheckboxSwitchProperty = migrateCheckboxSwitchProperty;
//# sourceMappingURL=058-migrate-checkbox-switch-property.js.map