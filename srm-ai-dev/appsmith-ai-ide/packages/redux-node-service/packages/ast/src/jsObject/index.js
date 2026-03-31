"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJSObject = exports.isJSFunctionProperty = exports.jsObjectDeclaration = void 0;
const acorn_walk_1 = require("acorn-walk");
const index_1 = require("../index");
const astring_1 = require("astring");
const index_2 = require("../index");
const index_3 = require("../../index");
const escodegen_1 = require("escodegen");
const utils_1 = require("../utils");
const jsObjectVariableName = "____INTERNAL_JS_OBJECT_NAME_USED_FOR_PARSING_____";
exports.jsObjectDeclaration = `var ${jsObjectVariableName} =`;
const isJSFunctionProperty = (t) => {
    return (0, index_1.isTypeOfFunction)(t.type);
};
exports.isJSFunctionProperty = isJSFunctionProperty;
const parseJSObject = (code) => {
    let ast = { end: 0, start: 0, type: "" };
    const result = [];
    try {
        const comments = [];
        const token = [];
        ast = (0, index_1.getAST)(code, {
            sourceType: index_3.SourceType.module,
            onComment: comments,
            onToken: token,
            ranges: true,
            locations: true,
        });
        (0, escodegen_1.attachComments)(ast, comments, token);
    }
    catch (e) {
        return { parsedObject: result, success: false };
    }
    const parsedObjectProperties = new Set();
    let JSObjectProperties = [];
    (0, acorn_walk_1.simple)(ast, {
        ExportDefaultDeclaration(node) {
            if (!(0, index_1.isExportDefaultDeclarationNode)(node) ||
                !(0, index_1.isObjectExpression)(node.declaration))
                return;
            JSObjectProperties = node.declaration
                .properties;
        },
    });
    JSObjectProperties.forEach((node) => {
        const propertyKey = node.key;
        let property = {
            key: (0, astring_1.generate)(node.key),
            value: (0, astring_1.generate)(node.value),
            rawContent: (0, utils_1.extractContentByPosition)(code, {
                from: {
                    line: node.loc.start.line - 1,
                    ch: node.loc.start.column,
                },
                to: {
                    line: node.loc.end.line - 1,
                    ch: node.loc.end.column - 1,
                },
            }),
            type: node.value.type,
            position: {
                startLine: node.loc.start.line,
                startColumn: node.loc.start.column,
                endLine: node.loc.end.line,
                endColumn: node.loc.end.column,
                keyStartLine: propertyKey.loc.start.line,
                keyEndLine: propertyKey.loc.end.line,
                keyStartColumn: propertyKey.loc.start.column,
                keyEndColumn: propertyKey.loc.end.column,
            },
        };
        if ((0, index_2.isPropertyAFunctionNode)(node.value)) {
            // if in future we need default values of each param, we could implement that in getFunctionalParamsFromNode
            // currently we don't consume it anywhere hence avoiding to calculate that.
            const params = (0, index_2.getFunctionalParamsFromNode)(node.value);
            property = {
                ...property,
                arguments: [...params],
                isMarkedAsync: node.value.async,
            };
        }
        parsedObjectProperties.add(property);
    });
    return { parsedObject: [...parsedObjectProperties], success: true };
};
exports.parseJSObject = parseJSObject;
//# sourceMappingURL=index.js.map