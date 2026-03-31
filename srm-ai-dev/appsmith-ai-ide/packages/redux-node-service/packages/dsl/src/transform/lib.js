"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nestDSL = exports.flattenDSL = void 0;
const constants_1 = require("./constants");
const normalizr_1 = require("normalizr");
// Schema by widgetId
const SCHEMA_BY_ID = new normalizr_1.schema.Entity("canvasWidgets", {}, { idAttribute: "widgetId" });
SCHEMA_BY_ID.define({ children: [SCHEMA_BY_ID] });
// Normalising using widgetId
function flattenDSL(nestedDSL) {
    const { entities, } = (0, normalizr_1.normalize)(nestedDSL, SCHEMA_BY_ID);
    return entities.canvasWidgets;
}
exports.flattenDSL = flattenDSL;
// Denormalising using widgetId
function nestDSL(flattenedDSL, widgetId = constants_1.ROOT_CONTAINER_WIDGET_ID) {
    const entities = { canvasWidgets: flattenedDSL };
    return (0, normalizr_1.denormalize)(widgetId, SCHEMA_BY_ID, entities);
}
exports.nestDSL = nestDSL;
//# sourceMappingURL=lib.js.map