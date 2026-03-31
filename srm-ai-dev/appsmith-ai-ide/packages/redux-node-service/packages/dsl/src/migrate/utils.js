"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.traverseDSLAndMigrate = exports.stringToJS = exports.isDynamicValue = exports.removeSpecialChars = exports.generateReactKey = exports.DATA_BIND_REGEX = exports.DATA_BIND_REGEX_GLOBAL = void 0;
const lodash_1 = require("lodash");
exports.DATA_BIND_REGEX_GLOBAL = /{{([\s\S]*?)}}/g;
exports.DATA_BIND_REGEX = /{{([\s\S]*?)}}/;
const ALPHANUMERIC = "1234567890abcdefghijklmnopqrstuvwxyz";
const generateReactKey = ({ prefix = "", } = {}) => {
    let id = "";
    for (let i = 0; i < 10; i++) {
        id += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
    }
    return prefix + id;
};
exports.generateReactKey = generateReactKey;
const removeSpecialChars = (value, limit) => {
    const separatorRegex = /\W+/;
    return value
        .split(separatorRegex)
        .join("_")
        .slice(0, limit || 30);
};
exports.removeSpecialChars = removeSpecialChars;
const isDynamicValue = (value) => exports.DATA_BIND_REGEX.test(value);
exports.isDynamicValue = isDynamicValue;
function getDynamicStringSegments(dynamicString) {
    let stringSegments = [];
    const indexOfDoubleParanStart = dynamicString.indexOf("{{");
    if (indexOfDoubleParanStart === -1) {
        return [dynamicString];
    }
    //{{}}{{}}}
    const firstString = dynamicString.substring(0, indexOfDoubleParanStart);
    firstString && stringSegments.push(firstString);
    let rest = dynamicString.substring(indexOfDoubleParanStart, dynamicString.length);
    //{{}}{{}}}
    let sum = 0;
    for (let i = 0; i <= rest.length - 1; i++) {
        const char = rest[i];
        const prevChar = rest[i - 1];
        if (char === "{") {
            sum++;
        }
        else if (char === "}") {
            sum--;
            if (prevChar === "}" && sum === 0) {
                stringSegments.push(rest.substring(0, i + 1));
                rest = rest.substring(i + 1, rest.length);
                if (rest) {
                    stringSegments = stringSegments.concat(getDynamicStringSegments(rest));
                    break;
                }
            }
        }
    }
    if (sum !== 0 && dynamicString !== "") {
        return [dynamicString];
    }
    return stringSegments;
}
function isJSAction(entity) {
    return (typeof entity === "object" &&
        "ENTITY_TYPE" in entity &&
        entity.ENTITY_TYPE === "JSACTION");
}
//{{}}{{}}}
const getDynamicBindings = (dynamicString, entity) => {
    // Protect against bad string parse
    if (!dynamicString || !(0, lodash_1.isString)(dynamicString)) {
        return { stringSegments: [], jsSnippets: [] };
    }
    const sanitisedString = dynamicString.trim();
    let stringSegments, paths;
    if (entity && isJSAction(entity)) {
        stringSegments = [sanitisedString];
        paths = [sanitisedString];
    }
    else {
        // Get the {{binding}} bound values
        stringSegments = getDynamicStringSegments(sanitisedString);
        // Get the "binding" path values
        paths = stringSegments.map((segment) => {
            const length = segment.length;
            const matches = (0, exports.isDynamicValue)(segment);
            if (matches) {
                return segment.substring(2, length - 2);
            }
            return "";
        });
    }
    return { stringSegments: stringSegments, jsSnippets: paths };
};
const stringToJS = (string) => {
    const { jsSnippets, stringSegments } = getDynamicBindings(string);
    const js = stringSegments
        .map((segment, index) => {
        if (jsSnippets[index] && jsSnippets[index].length > 0) {
            return jsSnippets[index];
        }
        else {
            return `\`${segment}\``;
        }
    })
        .join(" + ");
    return js;
};
exports.stringToJS = stringToJS;
// ### END JS Action ###
// ### Migration helpers ###
/*
 * Function to traverse the DSL tree and execute the given migration function for each widget present in
 * the tree.
 */
const traverseDSLAndMigrate = (DSL, migrateFn) => {
    DSL.children = DSL.children?.map((widget) => {
        migrateFn(widget);
        if (widget.children && widget.children.length > 0) {
            widget = (0, exports.traverseDSLAndMigrate)(widget, migrateFn);
        }
        return widget;
    });
    return DSL;
};
exports.traverseDSLAndMigrate = traverseDSLAndMigrate;
// ### END Migration helpers ###
//# sourceMappingURL=utils.js.map