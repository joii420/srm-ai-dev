"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceThisinMemberExpression = exports.getExpressionStringAtPos = exports.isPositionWithinNode = void 0;
const index_1 = require("../index");
const index_2 = require("../index");
const index_3 = require("../index");
const index_4 = require("../index");
const escodegen = __importStar(require("escodegen"));
const ast_1 = require("../constants/ast");
const isPositionWithinNode = (node, pos) => pos >= node.start && pos <= node.end;
exports.isPositionWithinNode = isPositionWithinNode;
const getExpressionStringAtPos = (node, pos, options, replaceThisExpression = true) => {
    if (!(0, exports.isPositionWithinNode)(node, pos))
        return;
    if ((0, index_4.isMemberExpressionNode)(node)) {
        return getExpressionAtPosFromMemberExpression(node, pos, options, replaceThisExpression);
    }
    else if ((0, index_4.isExpressionStatementNode)(node)) {
        return getExpressionAtPosFromExpressionStatement(node, pos, options);
    }
    else if ((0, index_4.isCallExpressionNode)(node)) {
        return getExpressionAtPosFromCallExpression(node, pos, options);
    }
    else if ((0, index_2.isBinaryExpressionNode)(node)) {
        return getExpressionAtPosFromBinaryExpression(node, pos, options);
    }
    else if ((0, index_1.isAwaitExpressionNode)(node)) {
        return (0, exports.getExpressionStringAtPos)(node.argument, pos, options);
    }
    else if ((0, index_3.isConditionalExpressionNode)(node)) {
        return getExpressionAtPosFromConditionalExpression(node, pos, options);
    }
    else if ((0, index_4.isIdentifierNode)(node)) {
        return removeSemiColon(escodegen.generate(node));
    }
};
exports.getExpressionStringAtPos = getExpressionStringAtPos;
const getExpressionAtPosFromMemberExpression = (node, pos, options, replaceThisExpression = true) => {
    const objectNode = node.object;
    if (isLocalVariableNode(node) || isLocalVariableNode(objectNode))
        return;
    if (replaceThisExpression && options?.thisExpressionReplacement) {
        node = (0, exports.replaceThisinMemberExpression)(node, options);
    }
    // stop if objectNode is a function call -> needs evaluation
    if ((0, index_4.isCallExpressionNode)(objectNode))
        return;
    // position is within the object node
    if (pos <= objectNode.end) {
        return (0, exports.getExpressionStringAtPos)(objectNode, pos, options, false);
    }
    // position is within the property node
    else {
        const propertyNode = node.property;
        if ((0, index_4.isMemberExpressionNode)(propertyNode)) {
            return getExpressionAtPosFromMemberExpression(propertyNode, pos, options, false);
        }
        // generate string for the whole path
        return escodegen.generate(node);
    }
};
const getExpressionAtPosFromExpressionStatement = (node, pos, options) => {
    if ((0, index_4.isThisExpressionNode)(node.expression) &&
        options?.thisExpressionReplacement) {
        node.expression = thisReplacementNode(node.expression, options);
    }
    return (0, exports.getExpressionStringAtPos)(node.expression, pos, options);
};
const getExpressionAtPosFromCallExpression = (node, pos, options) => {
    let selectedNode;
    // function call -> needs evaluation
    // if (isPositionWithinNode(node.callee, pos)) {
    //   selectedNode = node.callee;
    // }
    if (node.arguments.length > 0) {
        const argumentNode = node.arguments.find((node) => (0, exports.isPositionWithinNode)(node, pos));
        if (argumentNode) {
            selectedNode = argumentNode;
        }
    }
    return selectedNode && (0, exports.getExpressionStringAtPos)(selectedNode, pos, options);
};
const getExpressionAtPosFromConditionalExpression = (node, pos, options) => {
    let selectedNode;
    if ((0, exports.isPositionWithinNode)(node.test, pos)) {
        selectedNode = node.test;
    }
    else if ((0, exports.isPositionWithinNode)(node.consequent, pos)) {
        selectedNode = node.consequent;
    }
    else if ((0, exports.isPositionWithinNode)(node.alternate, pos)) {
        selectedNode = node.alternate;
    }
    return selectedNode && (0, exports.getExpressionStringAtPos)(selectedNode, pos, options);
};
const getExpressionAtPosFromBinaryExpression = (node, pos, options) => {
    let selectedNode;
    if ((0, exports.isPositionWithinNode)(node.left, pos)) {
        selectedNode = node.left;
    }
    else if ((0, exports.isPositionWithinNode)(node.right, pos)) {
        selectedNode = node.right;
    }
    return selectedNode && (0, exports.getExpressionStringAtPos)(selectedNode, pos, options);
};
const replaceThisinMemberExpression = (node, options) => {
    if ((0, index_4.isMemberExpressionNode)(node.object)) {
        node.object = (0, exports.replaceThisinMemberExpression)(node.object, options);
    }
    else if ((0, index_4.isThisExpressionNode)(node.object)) {
        node.object = thisReplacementNode(node.object, options);
    }
    return node;
};
exports.replaceThisinMemberExpression = replaceThisinMemberExpression;
// replace "this" node with the provided replacement
const thisReplacementNode = (node, options) => {
    return {
        ...node,
        type: ast_1.NodeTypes.Identifier,
        name: options.thisExpressionReplacement,
    };
};
const removeSemiColon = (value) => value.slice(-1) === ";" ? value.slice(0, value.length - 1) : value;
const isLocalVariableNode = (node) => (0, index_4.isMemberExpressionNode)(node) &&
    node.computed &&
    (0, index_4.isIdentifierNode)(node.property);
//# sourceMappingURL=utils.js.map