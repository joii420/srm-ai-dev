"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStringValue = exports.extractContentByPosition = exports.getNameFromPropertyNode = exports.isTrueObject = exports.sanitizeScript = void 0;
const unescape_js_1 = __importDefault(require("unescape-js"));
const index_1 = require("../index");
const beginsWithLineBreakRegex = /^\s+|\s+$/;
function sanitizeScript(js, evaluationVersion) {
    // We remove any line breaks from the beginning of the script because that
    // makes the final function invalid. We also unescape any escaped characters
    // so that eval can happen
    //default value of evalutaion version is 2
    evaluationVersion = evaluationVersion ? evaluationVersion : 2;
    const trimmedJS = js.replace(beginsWithLineBreakRegex, "");
    return evaluationVersion > 1 ? trimmedJS : (0, unescape_js_1.default)(trimmedJS);
}
exports.sanitizeScript = sanitizeScript;
// For the times when you need to know if something truly an object like { a: 1, b: 2}
// typeof, lodash.isObject and others will return false positives for things like array, null, etc
const isTrueObject = (item) => {
    return Object.prototype.toString.call(item) === "[object Object]";
};
exports.isTrueObject = isTrueObject;
const getNameFromPropertyNode = (node) => (0, index_1.isLiteralNode)(node.key) ? String(node.key.value) : node.key.name;
exports.getNameFromPropertyNode = getNameFromPropertyNode;
const extractContentByPosition = (content, position) => {
    const eachLine = content.split("\n");
    let returnedString = "";
    for (let i = position.from.line; i <= position.to.line; i++) {
        if (i === position.from.line) {
            returnedString =
                position.from.line !== position.to.line
                    ? eachLine[position.from.line].slice(position.from.ch)
                    : eachLine[position.from.line].slice(position.from.ch, position.to.ch + 1);
        }
        else if (i === position.to.line) {
            returnedString += eachLine[position.to.line].slice(0, position.to.ch + 1);
        }
        else {
            returnedString += eachLine[i];
        }
        if (i !== position.to.line) {
            returnedString += "\n";
        }
    }
    return returnedString;
};
exports.extractContentByPosition = extractContentByPosition;
const getStringValue = (inputValue) => {
    if (typeof inputValue === "object" || typeof inputValue === "boolean") {
        inputValue = JSON.stringify(inputValue);
    }
    else if (typeof inputValue === "number" || typeof inputValue === "string") {
        inputValue += "";
    }
    return inputValue;
};
exports.getStringValue = getStringValue;
//# sourceMappingURL=utils.js.map