"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTableSanitizeColumnKeys = void 0;
const utils_1 = require("../utils");
const getSubstringBetweenTwoWords = (str, startWord, endWord) => {
    const endIndexOfStartWord = str.indexOf(startWord) + startWord.length;
    const startIndexOfEndWord = str.lastIndexOf(endWord);
    if (startIndexOfEndWord < endIndexOfStartWord)
        return "";
    return str.substring(startIndexOfEndWord, endIndexOfStartWord);
};
/**
 * This migration sanitizes the following properties -
 * primaryColumns object key, for the value of each key - id, computedValue are sanitized
 * columnOrder
 * dynamicBindingPathList
 *
 * This migration solves the following issue -
 * https://github.com/appsmithorg/appsmith/issues/6897
 */
const migrateTableSanitizeColumnKeys = (currentDSL) => {
    currentDSL.children = currentDSL.children?.map((child) => {
        if (child.type === "TABLE_WIDGET") {
            const primaryColumnEntries = Object.entries(child.primaryColumns || {});
            const newPrimaryColumns = {};
            if (primaryColumnEntries.length) {
                for (const [, primaryColumnEntry] of primaryColumnEntries.entries()) {
                    // Value is reassigned when its invalid(Faulty DSL  https://github.com/appsmithorg/appsmith/issues/8979)
                    const [key] = primaryColumnEntry;
                    let [, value] = primaryColumnEntry;
                    const sanitizedKey = (0, utils_1.removeSpecialChars)(key, 200);
                    let id = "";
                    if (value.id) {
                        id = (0, utils_1.removeSpecialChars)(value.id, 200);
                    }
                    // When id is undefined it's likely value isn't correct and needs fixing
                    else if (Object.keys(value)) {
                        const onlyKey = Object.keys(value)[0];
                        const obj = value[onlyKey];
                        if (!obj.id && !obj.columnType) {
                            continue;
                        }
                        value = obj;
                        id = (0, utils_1.removeSpecialChars)(value.id, 200);
                    }
                    // Sanitizes "{{Table1.sanitizedTableData.map((currentRow) => ( currentRow.$$$random_header))}}"
                    // to "{{Table1.sanitizedTableData.map((currentRow) => ( currentRow._random_header))}}"
                    const computedValue = (value?.computedValue || "").replace(key, sanitizedKey);
                    newPrimaryColumns[sanitizedKey] = {
                        ...value,
                        computedValue,
                        id,
                    };
                }
                child.primaryColumns = newPrimaryColumns;
            }
            // Sanitizes [ "id", "name", $$$random_header ]
            // to [ "id", "name", _random_header ]
            child.columnOrder = (child.columnOrder || []).map((co) => (0, utils_1.removeSpecialChars)(co, 200));
            // Sanitizes [ {key: primaryColumns.$random.header.computedValue }]
            // to [ {key: primaryColumns._random_header.computedValue }]
            child.dynamicBindingPathList = (child.dynamicBindingPathList || []).map((path) => {
                const pathChunks = path.key.split("."); // primaryColumns.$random.header.computedValue -> [ "primaryColumns", "$random", "header", "computedValue"]
                // tableData is a valid dynamicBindingPath and pathChunks would have just one entry
                if (pathChunks.length < 2) {
                    return path;
                }
                const firstPart = pathChunks[0] + "."; // "primaryColumns."
                const lastPart = "." + pathChunks[pathChunks.length - 1]; // ".computedValue"
                const key = getSubstringBetweenTwoWords(path.key, firstPart, lastPart); // primaryColumns.$random.header.computedValue -> $random.header
                const sanitizedPrimaryColumnKey = (0, utils_1.removeSpecialChars)(key, 200);
                return {
                    key: firstPart + sanitizedPrimaryColumnKey + lastPart,
                };
            });
        }
        else if (child.children && child.children.length > 0) {
            child = (0, exports.migrateTableSanitizeColumnKeys)(child);
        }
        return child;
    });
    return currentDSL;
};
exports.migrateTableSanitizeColumnKeys = migrateTableSanitizeColumnKeys;
//# sourceMappingURL=037-migrate-table-sanitize-column-keys.js.map