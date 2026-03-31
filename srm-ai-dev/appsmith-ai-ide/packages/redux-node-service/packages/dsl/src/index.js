"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LATEST_DSL_VERSION = exports.migrateDSL = exports.ROOT_CONTAINER_WIDGET_ID = exports.flattenDSL = exports.nestDSL = void 0;
var transform_1 = require("./transform");
Object.defineProperty(exports, "nestDSL", { enumerable: true, get: function () { return transform_1.nestDSL; } });
Object.defineProperty(exports, "flattenDSL", { enumerable: true, get: function () { return transform_1.flattenDSL; } });
Object.defineProperty(exports, "ROOT_CONTAINER_WIDGET_ID", { enumerable: true, get: function () { return transform_1.ROOT_CONTAINER_WIDGET_ID; } });
var migrate_1 = require("./migrate");
Object.defineProperty(exports, "migrateDSL", { enumerable: true, get: function () { return migrate_1.migrateDSL; } });
Object.defineProperty(exports, "LATEST_DSL_VERSION", { enumerable: true, get: function () { return migrate_1.LATEST_DSL_VERSION; } });
//# sourceMappingURL=index.js.map