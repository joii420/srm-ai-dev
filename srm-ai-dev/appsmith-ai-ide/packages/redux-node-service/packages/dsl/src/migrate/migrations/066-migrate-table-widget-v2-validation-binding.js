"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTableWidgetV2ValidationBinding = void 0;
const utils_1 = require("../utils");
const oldBindingPrefix = `{{
  (
    (editedValue, currentRow, currentIndex) => (
`;
const newBindingPrefix = `{{
  (
    (editedValue, currentRow, currentIndex, isNewRow) => (
`;
const oldBindingSuffix = (tableId, columnName) => `
  ))
  (
    ${tableId}.columnEditableCellValue.${columnName} || "",
    ${tableId}.processedTableData[${tableId}.editableCell.index] ||
      Object.keys(${tableId}.processedTableData[0])
        .filter(key => ["__originalIndex__", "__primaryKey__"].indexOf(key) === -1)
        .reduce((prev, curr) => {
          prev[curr] = "";
          return prev;
        }, {}),
    ${tableId}.editableCell.index)
}}
`;
const newBindingSuffix = (tableId, columnName) => {
    return `
    ))
    (
      (${tableId}.isAddRowInProgress ? ${tableId}.newRow.${columnName} : ${tableId}.columnEditableCellValue.${columnName}) || "",
      ${tableId}.isAddRowInProgress ? ${tableId}.newRow : (${tableId}.processedTableData[${tableId}.editableCell.index] ||
        Object.keys(${tableId}.processedTableData[0])
          .filter(key => ["__originalIndex__", "__primaryKey__"].indexOf(key) === -1)
          .reduce((prev, curr) => {
            prev[curr] = "";
            return prev;
          }, {})),
      ${tableId}.isAddRowInProgress ? -1 : ${tableId}.editableCell.index,
      ${tableId}.isAddRowInProgress
    )
  }}
  `;
};
const migrateTableWidgetV2ValidationBinding = (currentDSL) => {
    return (0, utils_1.traverseDSLAndMigrate)(currentDSL, (widget) => {
        if (widget.type === "TABLE_WIDGET_V2") {
            const primaryColumns = widget.primaryColumns;
            for (const column in primaryColumns) {
                if (primaryColumns.hasOwnProperty(column) &&
                    primaryColumns[column].validation &&
                    primaryColumns[column].validation.isColumnEditableCellValid &&
                    (0, utils_1.isDynamicValue)(primaryColumns[column].validation.isColumnEditableCellValid)) {
                    const propertyValue = primaryColumns[column].validation.isColumnEditableCellValid;
                    const binding = propertyValue
                        .replace(oldBindingPrefix, "")
                        .replace(oldBindingSuffix(widget.widgetName, column), "");
                    primaryColumns[column].validation.isColumnEditableCellValid =
                        newBindingPrefix +
                            binding +
                            newBindingSuffix(widget.widgetName, column);
                }
            }
        }
    });
};
exports.migrateTableWidgetV2ValidationBinding = migrateTableWidgetV2ValidationBinding;
//# sourceMappingURL=066-migrate-table-widget-v2-validation-binding.js.map