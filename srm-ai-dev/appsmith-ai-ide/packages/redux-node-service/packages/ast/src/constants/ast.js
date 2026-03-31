"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeTypes = exports.SourceType = exports.ECMA_VERSION = void 0;
exports.ECMA_VERSION = 11;
/* Indicates the mode the code should be parsed in.
This influences global strict mode and parsing of import and export declarations.
*/
var SourceType;
(function (SourceType) {
    SourceType["script"] = "script";
    SourceType["module"] = "module";
})(SourceType = exports.SourceType || (exports.SourceType = {}));
// Each node has an attached type property which further defines
// what all properties can the node have.
// We will just define the ones we are working with
var NodeTypes;
(function (NodeTypes) {
    NodeTypes["Identifier"] = "Identifier";
    NodeTypes["AssignmentPattern"] = "AssignmentPattern";
    NodeTypes["Literal"] = "Literal";
    NodeTypes["Property"] = "Property";
    // Declaration - https://github.com/estree/estree/blob/master/es5.md#declarations
    NodeTypes["FunctionDeclaration"] = "FunctionDeclaration";
    NodeTypes["ExportDefaultDeclaration"] = "ExportDefaultDeclaration";
    NodeTypes["VariableDeclarator"] = "VariableDeclarator";
    // Expression - https://github.com/estree/estree/blob/master/es5.md#expressions
    NodeTypes["MemberExpression"] = "MemberExpression";
    NodeTypes["FunctionExpression"] = "FunctionExpression";
    NodeTypes["ArrowFunctionExpression"] = "ArrowFunctionExpression";
    NodeTypes["AssignmentExpression"] = "AssignmentExpression";
    NodeTypes["ObjectExpression"] = "ObjectExpression";
    NodeTypes["ArrayExpression"] = "ArrayExpression";
    NodeTypes["ThisExpression"] = "ThisExpression";
    NodeTypes["CallExpression"] = "CallExpression";
    NodeTypes["BinaryExpression"] = "BinaryExpression";
    NodeTypes["ExpressionStatement"] = "ExpressionStatement";
    NodeTypes["BlockStatement"] = "BlockStatement";
    NodeTypes["ConditionalExpression"] = "ConditionalExpression";
    NodeTypes["AwaitExpression"] = "AwaitExpression";
})(NodeTypes = exports.NodeTypes || (exports.NodeTypes = {}));
//# sourceMappingURL=ast.js.map