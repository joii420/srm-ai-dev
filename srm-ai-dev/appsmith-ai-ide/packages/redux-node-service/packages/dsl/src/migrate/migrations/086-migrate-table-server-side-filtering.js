"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTableServerSideFiltering = void 0;
const utils_1 = require("../utils");
const migrateTableServerSideFiltering = (currentDSL) => {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (widget.type === "TABLE_WIDGET_V2") {
            widget.enableServerSideFiltering = false;
        }
    });
};
exports.migrateTableServerSideFiltering = migrateTableServerSideFiltering;
//# sourceMappingURL=086-migrate-table-server-side-filtering.js.map