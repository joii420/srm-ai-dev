import type { DSLWidget } from "../types";
/**
 * This migration sanitizes the following properties -
 * primaryColumns object key, for the value of each key - id, computedValue are sanitized
 * columnOrder
 * dynamicBindingPathList
 *
 * This migration solves the following issue -
 * https://github.com/appsmithorg/appsmith/issues/6897
 */
export declare const migrateTableSanitizeColumnKeys: (currentDSL: DSLWidget) => DSLWidget;
//# sourceMappingURL=037-migrate-table-sanitize-column-keys.d.ts.map