"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateScrollTruncateProperties = exports.OverflowTypes = void 0;
var OverflowTypes;
(function (OverflowTypes) {
    OverflowTypes["SCROLL"] = "SCROLL";
    OverflowTypes["TRUNCATE"] = "TRUNCATE";
    OverflowTypes["NONE"] = "NONE";
})(OverflowTypes = exports.OverflowTypes || (exports.OverflowTypes = {}));
const migrateScrollTruncateProperties = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "TEXT_WIDGET") {
            if (child.shouldTruncate) {
                child.overflow = OverflowTypes.TRUNCATE;
            }
            else if (child.shouldScroll) {
                child.overflow = OverflowTypes.SCROLL;
            }
            else {
                child.overflow = OverflowTypes.NONE;
            }
            delete child.shouldScroll;
            delete child.shouldTruncate;
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateScrollTruncateProperties)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateScrollTruncateProperties = migrateScrollTruncateProperties;
//# sourceMappingURL=053-migrate-scroll-truncate-property.js.map