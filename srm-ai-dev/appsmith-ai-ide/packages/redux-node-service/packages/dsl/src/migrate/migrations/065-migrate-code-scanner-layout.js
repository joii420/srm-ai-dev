"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateCodeScannerLayout = void 0;
const migrateCodeScannerLayout = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "CODE_SCANNER_WIDGET") {
            if (!child.scannerLayout) {
                child.scannerLayout = "CLICK_TO_SCAN";
            }
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateCodeScannerLayout)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateCodeScannerLayout = migrateCodeScannerLayout;
//# sourceMappingURL=065-migrate-code-scanner-layout.js.map