"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setGenericArgAtPostition = exports.checkIfArgumentExistAtPosition = exports.checkIfCatchBlockExists = exports.checkIfThenBlockExists = exports.setQueryParam = exports.getQueryParam = exports.getFunctionParams = exports.getCallExpressions = exports.getFunctionNameFromJsObjectExpression = exports.getFunctionArguments = exports.setCatchBlockInQuery = exports.setThenBlockInQuery = exports.getThenCatchBlocksFromQuery = exports.getFunctionName = exports.getMainAction = exports.getFunctionBodyStatements = exports.canTranslateToUI = exports.getActionBlocks = exports.replaceActionInQuery = exports.getFunction = exports.getFuncExpressionAtPosition = exports.setModalName = exports.getModalName = exports.setEnumArgumentAtPosition = exports.getEnumArgumentAtPosition = exports.setObjectAtPosition = exports.setCallbackFunctionField = exports.setTextArgumentAtPosition = exports.getTextArgumentAtPosition = void 0;
const index_1 = require("../index");
const utils_1 = require("../utils");
const acorn_walk_1 = require("acorn-walk");
const constants_1 = require("../constants");
const astring_1 = require("astring");
const json_1 = require("klona/json");
const LENGTH_OF_QUOTES = 2;
const NEXT_POSITION = 1;
const getTextArgumentAtPosition = (value, argNum, evaluationVersion) => {
    // Takes a function string and returns the text argument at argNum position
    let ast = { end: 0, start: 0, type: "" };
    let requiredArgument = "";
    const commentArray = [];
    let astWithComments;
    try {
        // sanitize to remove unnecessary characters which might lead to invalid ast
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        const wrappedCode = (0, index_1.wrapCode)(sanitizedScript);
        ast = (0, index_1.getAST)(wrappedCode, {
            locations: true,
            ranges: true,
            // collect all comments as they are not part of the ast, we will attach them back on line 46
            onComment: commentArray,
        });
        astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
    }
    catch (error) {
        // if ast is invalid return a blank string
        return requiredArgument;
    }
    const node = findRootCallExpression(astWithComments);
    if (node && (0, index_1.isCallExpressionNode)(node)) {
        const argument = node.arguments[argNum];
        // return appropriate values based on the type of node
        switch (argument?.type) {
            case constants_1.NodeTypes.Identifier:
            case constants_1.NodeTypes.ObjectExpression:
                // this is for objects
                requiredArgument = `{{${(0, astring_1.generate)(argument, {
                    comments: true,
                }).trim()}}}`;
                break;
            case constants_1.NodeTypes.Literal:
                requiredArgument =
                    typeof argument.value === "string"
                        ? argument.value
                        : `{{${argument.value}}}`;
                break;
            case constants_1.NodeTypes.MemberExpression:
                // this is for cases where we have {{appsmith.mode}} or {{Jsobj1.mytext}}
                requiredArgument = `{{${(0, astring_1.generate)(argument, {
                    comments: true,
                }).trim()}}}`;
                break;
            case constants_1.NodeTypes.BinaryExpression:
                // this is cases where we have string concatenation
                requiredArgument = `{{${(0, astring_1.generate)(argument, {
                    comments: true,
                }).trim()}}}`;
                break;
            default:
                requiredArgument = argument
                    ? `{{${(0, astring_1.generate)(argument, { comments: true }).trim()}}}`
                    : "";
                break;
        }
    }
    return requiredArgument;
};
exports.getTextArgumentAtPosition = getTextArgumentAtPosition;
const setTextArgumentAtPosition = (currentValue, changeValue, argNum, evaluationVersion) => {
    // Takes a function string and a value to be changed at a particular position
    // it returns the replaced function string with current value at argNum position
    let ast = { end: 0, start: 0, type: "" };
    let changedValue = currentValue;
    const commentArray = [];
    let astWithComments;
    const rawValue = typeof changeValue === "string"
        ? String.raw `"${changeValue}"`
        : String.raw `${changeValue}`;
    try {
        // sanitize to remove unnecessary characters which might lead to invalid ast
        const changeValueScript = (0, utils_1.sanitizeScript)(rawValue, evaluationVersion);
        (0, index_1.getAST)(changeValueScript, {
            locations: true,
            ranges: true,
        });
        const sanitizedScript = (0, utils_1.sanitizeScript)(currentValue, evaluationVersion);
        const __ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            // collect all comments as they are not part of the ast, we will attach them back on line 46
            onComment: commentArray,
        });
        // clone ast to avoid mutating original ast
        ast = (0, json_1.klona)(__ast);
        // attach comments to ast
        astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
    }
    catch (error) {
        // if ast is invalid return original string
        throw error;
    }
    const node = findRootCallExpression(astWithComments);
    if (node && (0, index_1.isCallExpressionNode)(node)) {
        const startPosition = node.callee.end + NEXT_POSITION;
        node.arguments = node.arguments || [];
        node.arguments[argNum] = {
            type: constants_1.NodeTypes.Literal,
            value: changeValue,
            raw: rawValue,
            start: startPosition,
            // add 2 for quotes
            end: startPosition + (changeValue.length + LENGTH_OF_QUOTES),
        };
        changedValue = `{{${(0, astring_1.generate)(astWithComments, {
            comments: true,
        }).trim()}}}`;
    }
    return changedValue;
};
exports.setTextArgumentAtPosition = setTextArgumentAtPosition;
const setCallbackFunctionField = (currentValue, changeValue, argNum, evaluationVersion) => {
    // Takes a function string and a callback function to be changed at a particular position
    // it returns the replaced function string with current callback at argNum position
    let ast = { end: 0, start: 0, type: "" };
    let changeValueAst = { end: 0, start: 0, type: "" };
    let changedValue = currentValue;
    const changedValueCommentArray = [];
    const currentValueCommentArray = [];
    let changeValueAstWithComments, currentValueAstWithComments;
    let requiredNode;
    try {
        // sanitize to remove unnecessary characters which might lead to invalid ast
        const sanitizedScript = (0, utils_1.sanitizeScript)(currentValue, evaluationVersion);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            // collect all comments as they are not part of the ast, we will attach them back on line 46
            onComment: currentValueCommentArray,
        });
        const sanitizedChangeValue = (0, utils_1.sanitizeScript)(changeValue, evaluationVersion);
        changeValueAst = (0, index_1.getAST)(sanitizedChangeValue, {
            locations: true,
            ranges: true,
            // collect all comments as they are not part of the ast, we will attach them back on line 46
            onComment: changedValueCommentArray,
        });
        // attach comments to ast
        // clone ast to avoid mutating original ast
        changeValueAstWithComments = (0, json_1.klona)((0, index_1.attachCommentsToAst)(changeValueAst, changedValueCommentArray));
        currentValueAstWithComments = (0, json_1.klona)((0, index_1.attachCommentsToAst)(ast, currentValueCommentArray));
    }
    catch (error) {
        // if ast is invalid throw error
        throw error;
    }
    const changeValueNodeFound = (0, acorn_walk_1.findNodeAt)(changeValueAstWithComments, 0, undefined, (type) => type === "Program");
    if (changeValueNodeFound) {
        requiredNode =
            // @ts-expect-error: types not matched
            changeValueNodeFound?.node?.body[0]?.expression ||
                changeValueNodeFound.node;
    }
    const found = (0, acorn_walk_1.findNodeAt)(currentValueAstWithComments, 0, undefined, (type, node) => (0, index_1.isCallExpressionNode)(node));
    if (found) {
        const { node } = found;
        // When there is an argument after the specified argument number, then only add empty string literal
        // @ts-expect-error: types not matched
        if (changeValue === "" && node.arguments[argNum + 1]) {
            requiredNode = {
                type: constants_1.NodeTypes.Literal,
                value: `${changeValue}`,
                raw: `'${String.raw `${changeValue}`}'`,
                start: 0,
                end: 2,
            };
        }
        // @ts-expect-error: types not matched
        if (node.arguments[argNum]) {
            // @ts-expect-error: types not matched
            node.arguments[argNum] = requiredNode;
        }
        else {
            // @ts-expect-error: types not matched
            node.arguments.push(requiredNode);
        }
        changedValue = (0, astring_1.generate)(currentValueAstWithComments, {
            comments: true,
        }).trim();
        try {
            (0, index_1.getAST)(changedValue);
        }
        catch (e) {
            throw e;
        }
    }
    return changedValue;
};
exports.setCallbackFunctionField = setCallbackFunctionField;
const setObjectAtPosition = (currentValue, changeValue, argNum, evaluationVersion) => {
    // Takes a function string and an object to be changed at a particular position
    // it returns the replaced function string with the object at argNum position
    if (typeof changeValue !== "string" ||
        changeValue === "" ||
        changeValue.trim() === "") {
        changeValue = "{}";
    }
    changeValue = changeValue.trim();
    let ast = { end: 0, start: 0, type: "" };
    let changedValue = currentValue;
    const commentArray = [];
    let astWithComments;
    try {
        // sanitize to remove unnecessary characters which might lead to invalid ast
        const sanitizedScript = (0, utils_1.sanitizeScript)(currentValue, evaluationVersion);
        const __ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            // collect all comments as they are not part of the ast, we will attach them back on line 46
            onComment: commentArray,
        });
        // clone ast to avoid mutating original ast
        ast = (0, json_1.klona)(__ast);
        // attach comments to ast
        astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
    }
    catch (error) {
        // if ast is invalid throw error
        throw error;
    }
    const node = findRootCallExpression(astWithComments);
    if (node && (0, index_1.isCallExpressionNode)(node)) {
        const startPosition = node.callee.end + NEXT_POSITION;
        node.arguments[argNum] = {
            type: constants_1.NodeTypes.Literal,
            value: changeValue,
            raw: String.raw `${changeValue}`,
            start: startPosition,
            // add 2 for quotes
            end: startPosition + (changeValue.length + LENGTH_OF_QUOTES),
        };
        changedValue = (0, astring_1.generate)(astWithComments, { comments: true }).trim();
        try {
            (0, index_1.getAST)(changedValue);
        }
        catch (e) {
            throw e;
        }
    }
    return `{{${changedValue}}}`;
};
exports.setObjectAtPosition = setObjectAtPosition;
const getEnumArgumentAtPosition = (value, argNum, defaultValue, evaluationVersion) => {
    // Takes a function string and return enum argument at a particular position
    // enum argument -> this is for selectors
    let ast = { end: 0, start: 0, type: "" };
    let requiredArgument = defaultValue;
    const commentArray = [];
    let astWithComments;
    try {
        // sanitize to remove unnecessary characters which might lead to invalid ast
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        // const wrappedCode = wrapCode(sanitizedScript);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            // collect all comments as they are not part of the ast, we will attach them back on line 46
            onComment: commentArray,
        });
        // attach comments to ast
        astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
    }
    catch (error) {
        // if ast is invalid return default value
        return defaultValue;
    }
    // Api1.run(() => { showAlert("", () => { showAlert("") }) })
    const node = findRootCallExpression(astWithComments);
    if (node && (0, index_1.isCallExpressionNode)(node)) {
        if (node.arguments[argNum]) {
            const argument = node.arguments[argNum];
            switch (argument?.type) {
                case constants_1.NodeTypes.Literal:
                    requiredArgument = argument.raw;
            }
        }
    }
    return requiredArgument;
};
exports.getEnumArgumentAtPosition = getEnumArgumentAtPosition;
const setEnumArgumentAtPosition = (currentValue, changeValue, argNum, evaluationVersion) => {
    // Takes a function string and an enum argument to be changed at a particular position
    // it returns the replaced function string with enum arg at argNum position
    // enum arg -> selectors
    let ast = { end: 0, start: 0, type: "" };
    let changedValue = currentValue;
    const commentArray = [];
    let astWithComments;
    try {
        // sanitize to remove unnecessary characters which might lead to invalid ast
        const sanitizedScript = (0, utils_1.sanitizeScript)(currentValue, evaluationVersion);
        const __ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            // collect all comments as they are not part of the ast, we will attach them back on line 46
            onComment: commentArray,
        });
        // clone ast to avoid mutating original ast
        ast = (0, json_1.klona)(__ast);
        // attach comments to ast
        astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
    }
    catch (error) {
        // if ast is invalid throw error
        throw error;
    }
    try {
        (0, index_1.getAST)(changeValue);
    }
    catch (e) {
        return currentValue;
    }
    const node = findRootCallExpression(astWithComments);
    if (node && (0, index_1.isCallExpressionNode)(node)) {
        // add 1 to get the starting position of the next
        // node to ending position of previous
        const startPosition = node.callee.end + NEXT_POSITION;
        node.arguments[argNum] = {
            type: constants_1.NodeTypes.Literal,
            value: `${changeValue}`,
            raw: String.raw `${changeValue}`,
            start: startPosition,
            // add 2 for quotes
            end: startPosition + (changeValue.length + LENGTH_OF_QUOTES),
        };
        changedValue = `{{${(0, astring_1.generate)(astWithComments, {
            comments: true,
        }).trim()}}}`;
    }
    return changedValue;
};
exports.setEnumArgumentAtPosition = setEnumArgumentAtPosition;
const getModalName = (value, evaluationVersion) => {
    // Takes a function string and returns modal name at a particular position
    let ast = { end: 0, start: 0, type: "" };
    let modalName = "none";
    const commentArray = [];
    let astWithComments;
    try {
        // sanitize to remove unnecessary characters which might lead to invalid ast
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        const wrappedCode = (0, index_1.wrapCode)(sanitizedScript);
        ast = (0, index_1.getAST)(wrappedCode, {
            locations: true,
            ranges: true,
            // collect all comments as they are not part of the ast, we will attach them back on line 46
            onComment: commentArray,
        });
        // attach comments to ast
        astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
    }
    catch (error) {
        // if ast is invalid return modal name
        return modalName;
    }
    const node = findRootCallExpression(astWithComments);
    if (node && (0, index_1.isCallExpressionNode)(node)) {
        const argument = node.arguments[0];
        switch (argument?.type) {
            case constants_1.NodeTypes.Literal:
                modalName = argument.value;
                break;
            case constants_1.NodeTypes.MemberExpression:
                // this is for cases where we have {{showModal(Modal1.name)}} or {{closeModal(Modal1.name)}}
                // modalName = Modal1.name;
                modalName = (0, astring_1.generate)(argument, {
                    comments: true,
                }).trim();
                break;
        }
    }
    return modalName;
};
exports.getModalName = getModalName;
const setModalName = (currentValue, changeValue, evaluationVersion) => {
    // takes function string as input and sets modal name at particular position
    let ast = { end: 0, start: 0, type: "" };
    let changedValue = currentValue;
    const commentArray = [];
    let astWithComments;
    try {
        // sanitize to remove unnecessary characters which might lead to invalid ast
        const sanitizedScript = (0, utils_1.sanitizeScript)(currentValue, evaluationVersion);
        const __ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            // collect all comments as they are not part of the ast, we will attach them back on line 46
            onComment: commentArray,
        });
        // clone ast to avoid mutating original ast
        ast = (0, json_1.klona)(__ast);
        // attach comments to ast
        astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
    }
    catch (error) {
        // if ast is invalid throw error
        throw error;
    }
    const node = findRootCallExpression(astWithComments);
    if (node && (0, index_1.isCallExpressionNode)(node)) {
        // add 1 to get the starting position of the next
        // node to ending position of previous
        const startPosition = node.callee.end + NEXT_POSITION;
        const newNode = {
            type: constants_1.NodeTypes.Literal,
            value: `${changeValue}`,
            raw: String.raw `${changeValue}`,
            start: startPosition,
            // add 2 for quotes
            end: startPosition + (changeValue.length + LENGTH_OF_QUOTES),
        };
        node.arguments = [newNode];
        changedValue = `{{${(0, astring_1.generate)(astWithComments, {
            comments: true,
        }).trim()}}}`;
    }
    return changedValue;
};
exports.setModalName = setModalName;
const getFuncExpressionAtPosition = (value, argNum, evaluationVersion) => {
    // takes a function string and returns the function expression at the position
    let ast = { end: 0, start: 0, type: "" };
    let requiredArgument = "() => {}";
    const commentArray = [];
    try {
        // sanitize to remove unnecessary characters which might lead to invalid ast
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            // collect all comments as they are not part of the ast, we will attach them back on line 46
            onComment: commentArray,
        });
        // attach comments to ast
        const astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
        /**
         * We need to traverse the ast to find the first callee
         * For Eg. Api1.run(() => {}, () => {}).then(() => {}).catch(() => {})
         * We have multiple callee above, the first one is run
         * Similarly, for eg. appsmith.geolocation.getCurrentPosition(() => {}, () => {});
         * For this one, the first callee is getCurrentPosition
         */
        const firstCallExpressionNode = findRootCallExpression(astWithComments);
        const argumentNode = firstCallExpressionNode?.arguments[argNum];
        if (argumentNode &&
            ((0, index_1.isTypeOfFunction)(argumentNode.type) ||
                (0, index_1.isCallExpressionNode)(argumentNode))) {
            requiredArgument = `${(0, astring_1.generate)(argumentNode, { comments: true })}`;
        }
        else {
            requiredArgument = "";
        }
        return requiredArgument;
    }
    catch (error) {
        // if ast is invalid return the blank function
        return requiredArgument;
    }
};
exports.getFuncExpressionAtPosition = getFuncExpressionAtPosition;
const getFunction = (value, evaluationVersion) => {
    // returns the function name from the function expression
    let ast = { end: 0, start: 0, type: "" };
    let requiredFunction = "";
    const commentArray = [];
    let astWithComments;
    try {
        // sanitize to remove unnecessary characters which might lead to invalid ast
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        const wrappedCode = (0, index_1.wrapCode)(sanitizedScript);
        ast = (0, index_1.getAST)(wrappedCode, {
            locations: true,
            ranges: true,
            // collect all comments as they are not part of the ast, we will attach them back on line 46
            onComment: commentArray,
        });
        // attach comments to ast
        astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
    }
    catch (error) {
        // if ast is invalid return the original function
        return requiredFunction;
    }
    const node = findRootCallExpression(astWithComments);
    if (node && (0, index_1.isCallExpressionNode)(node)) {
        const func = `${(0, astring_1.generate)(node)}`;
        requiredFunction = func !== "{}" ? `{{${func}}}` : "";
    }
    return requiredFunction;
};
exports.getFunction = getFunction;
const replaceActionInQuery = (query, changeAction, argNum, evaluationVersion) => {
    // takes a query in this format -> Api.run( () => {}, () => {})
    // takes an action and its position and replaces it
    let ast = { end: 0, start: 0, type: "" };
    let changeActionAst = { end: 0, start: 0, type: "" };
    let requiredNode = {
        end: 0,
        start: 0,
        type: constants_1.NodeTypes.ArrowFunctionExpression,
        params: [],
        id: null,
        async: false,
    };
    let requiredQuery = "";
    const commentArray = [];
    const changeActionCommentArray = [];
    let astWithComments, changeActionAstWithComments;
    try {
        // sanitize to remove unnecessary characters which might lead to invalid ast
        const sanitizedScript = (0, utils_1.sanitizeScript)(query, evaluationVersion);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            // collect all comments as they are not part of the ast, we will attach them back on line 46
            onComment: commentArray,
        });
        const sanitizedChangeAction = (0, utils_1.sanitizeScript)(changeAction, evaluationVersion);
        changeActionAst = (0, index_1.getAST)(sanitizedChangeAction, {
            locations: true,
            ranges: true,
            // collect all comments as they are not part of the ast, we will attach them back on line 46
            onComment: changeActionCommentArray,
        });
        // attach comments to ast
        // clone ast to avoid mutating original ast
        astWithComments = (0, json_1.klona)((0, index_1.attachCommentsToAst)(ast, commentArray));
        changeActionAstWithComments = (0, json_1.klona)((0, index_1.attachCommentsToAst)(changeActionAst, changeActionCommentArray));
    }
    catch (error) {
        // if ast is invalid throw error
        throw error;
    }
    (0, acorn_walk_1.simple)(changeActionAstWithComments, {
        ArrowFunctionExpression(node) {
            if ((0, index_1.isArrowFunctionExpression)(node)) {
                requiredNode = node;
            }
        },
    });
    (0, acorn_walk_1.simple)(astWithComments, {
        CallExpression(node) {
            if ((0, index_1.isCallExpressionNode)(node) &&
                (0, index_1.isMemberExpressionNode)(node.callee) &&
                node.arguments[argNum]) {
                // add 1 to get the starting position of the next
                // node to ending position of previous
                const startPosition = node.arguments[argNum].start;
                requiredNode.start = startPosition;
                requiredNode.end = startPosition + changeAction.length;
                node.arguments[argNum] = requiredNode;
                requiredQuery = `${(0, astring_1.generate)(astWithComments, {
                    comments: true,
                }).trim()}`;
            }
        },
    });
    return requiredQuery;
};
exports.replaceActionInQuery = replaceActionInQuery;
/**
 * This function gets the action blocks which are basically the individual expression statements in the code
 */
function getActionBlocks(value, evaluationVersion) {
    let ast = { end: 0, start: 0, type: "" };
    const commentArray = [];
    const actionBlocks = [];
    let astWithComments;
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            onComment: commentArray,
        });
        astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
    }
    catch (error) {
        return actionBlocks;
    }
    astWithComments.body.forEach((node) => {
        actionBlocks.push((0, astring_1.generate)(node, { comments: true }).trim());
    });
    return actionBlocks;
}
exports.getActionBlocks = getActionBlocks;
/**
 * This function gets the action block top-level names
 */
function canTranslateToUI(value, evaluationVersion) {
    let ast = { end: 0, start: 0, type: "" };
    const commentArray = [];
    let canTranslate = true;
    let astWithComments;
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            onComment: commentArray,
        });
        astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
    }
    catch (error) {
        return false;
    }
    (0, acorn_walk_1.simple)(astWithComments, {
        ConditionalExpression(node) {
            if (
            // @ts-expect-error: types not matched
            (0, index_1.isCallExpressionNode)(node.consequent) ||
                // @ts-expect-error: types not matched
                (0, index_1.isCallExpressionNode)(node.alternate)) {
                canTranslate = false;
            }
        },
        LogicalExpression(node) {
            // @ts-expect-error: types not matched
            if ((0, index_1.isCallExpressionNode)(node.left) || (0, index_1.isCallExpressionNode)(node.right)) {
                canTranslate = false;
            }
        },
    });
    if (!canTranslate)
        return canTranslate;
    for (const node of astWithComments.body) {
        if ((0, index_1.isExpressionStatementNode)(node)) {
            const expression = node.expression;
            if (!(0, index_1.isCallExpressionNode)(expression)) {
                canTranslate = false;
                break;
            }
            const rootCallExpression = findRootCallExpression(expression);
            if (!rootCallExpression) {
                canTranslate = false;
                break;
            }
        }
        else {
            canTranslate = false;
        }
    }
    return canTranslate;
}
exports.canTranslateToUI = canTranslateToUI;
function getFunctionBodyStatements(value, evaluationVersion) {
    let ast = { end: 0, start: 0, type: "" };
    const commentArray = [];
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            onComment: commentArray,
        });
        const astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
        const mainBody = astWithComments.body[0];
        let statementsBody = [];
        switch (mainBody.type) {
            case constants_1.NodeTypes.ExpressionStatement:
                if (mainBody.expression.body.type === constants_1.NodeTypes.BlockStatement)
                    statementsBody = mainBody.expression.body.body;
                else if (mainBody.expression.body.type === constants_1.NodeTypes.CallExpression)
                    statementsBody = [mainBody.expression.body];
                break;
            case constants_1.NodeTypes.FunctionDeclaration:
                statementsBody = mainBody.body.body;
                break;
        }
        return statementsBody.map((node) => (0, astring_1.generate)(node, { comments: true }).trim());
    }
    catch (error) {
        return [];
    }
}
exports.getFunctionBodyStatements = getFunctionBodyStatements;
function getMainAction(value, evaluationVersion) {
    let ast = { end: 0, start: 0, type: "" };
    const commentArray = [];
    let mainAction = "";
    let astWithComments;
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            onComment: commentArray,
        });
        astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
    }
    catch (error) {
        return mainAction;
    }
    (0, acorn_walk_1.simple)(astWithComments, {
        ExpressionStatement(node) {
            (0, acorn_walk_1.simple)(node, {
                CallExpression(node) {
                    // @ts-expect-error: types not matched
                    if (node.callee.type === constants_1.NodeTypes.Identifier) {
                        mainAction = (0, astring_1.generate)(node, { comments: true }).trim();
                    }
                    else {
                        mainAction =
                            // @ts-expect-error: types not matched
                            (0, astring_1.generate)(node.callee, { comments: true }).trim() + "()";
                    }
                },
            });
        },
    });
    return mainAction;
}
exports.getMainAction = getMainAction;
function getFunctionName(value, evaluationVersion) {
    let ast = { end: 0, start: 0, type: "" };
    const commentArray = [];
    const functionName = "";
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            onComment: commentArray,
        });
        const astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
        const firstCallExpressionNode = findRootCallExpression(astWithComments);
        return firstCallExpressionNode
            ? (0, astring_1.generate)(firstCallExpressionNode?.callee, { comments: true })
            : "";
    }
    catch (error) {
        return functionName;
    }
}
exports.getFunctionName = getFunctionName;
// this function extracts the then/catch blocks when query is in this form
// Api1.run(() => {}, () => {}, {}).then(() => {}).catch(() => {}), or
// Api1.run(() => {}, () => {}, {}).then(() => {}), or
// Api1.run(() => {}, () => {}, {}).catch(() => {}), or
function getThenCatchBlocksFromQuery(value, evaluationVersion) {
    let ast = { end: 0, start: 0, type: "" };
    const commentArray = [];
    const returnValue = {};
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            onComment: commentArray,
        });
        const astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
        const rootCallExpression = findRootCallExpression(astWithComments);
        if (!rootCallExpression)
            return returnValue;
        let firstBlockType;
        const firstBlock = (0, acorn_walk_1.findNodeAt)(astWithComments, 0, undefined, function (type, node) {
            if ((0, index_1.isCallExpressionNode)(node)) {
                if ((0, index_1.isMemberExpressionNode)(node.callee)) {
                    if (node.callee.object === rootCallExpression) {
                        if ((0, index_1.isIdentifierNode)(node.callee.property)) {
                            if (["then", "catch"].includes(node.callee.property.name)) {
                                firstBlockType = node.callee.property.name;
                                return true;
                            }
                        }
                    }
                }
            }
            return false;
        })?.node;
        if (!firstBlock)
            return returnValue;
        if (!(0, index_1.isCallExpressionNode)(firstBlock) || !firstBlockType)
            return returnValue;
        const args = firstBlock.arguments;
        if (args.length) {
            returnValue[firstBlockType] = (0, astring_1.generate)(args[0]);
        }
        const secondBlockType = firstBlockType === "then" ? "catch" : "then";
        const secondBlock = (0, acorn_walk_1.findNodeAt)(ast, 0, undefined, function (type, node) {
            if ((0, index_1.isCallExpressionNode)(node)) {
                if ((0, index_1.isMemberExpressionNode)(node.callee)) {
                    if (node.callee.object === firstBlock) {
                        if ((0, index_1.isIdentifierNode)(node.callee.property))
                            return node.callee.property.name === secondBlockType;
                    }
                }
            }
            return false;
        })?.node;
        if (secondBlock && (0, index_1.isCallExpressionNode)(secondBlock)) {
            const args = secondBlock.arguments;
            if (args.length > 0) {
                returnValue[secondBlockType] = (0, astring_1.generate)(args[0]);
            }
        }
        return returnValue;
    }
    catch (error) {
        return returnValue;
    }
}
exports.getThenCatchBlocksFromQuery = getThenCatchBlocksFromQuery;
function setThenBlockInQuery(value, thenBlock, evaluationVersion) {
    let ast = { end: 0, start: 0, type: "" };
    const commentArray = [];
    let requiredQuery = "";
    thenBlock = thenBlock || "() => {}";
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            onComment: commentArray,
        });
        const astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
        const rootCallExpression = findRootCallExpression(astWithComments);
        let thenCallExpressionInGivenQuery = (0, acorn_walk_1.findNodeAt)(astWithComments, 0, undefined, function (type, node) {
            if ((0, index_1.isCallExpressionNode)(node)) {
                if ((0, index_1.isMemberExpressionNode)(node.callee)) {
                    if (node.callee.object === rootCallExpression) {
                        if ((0, index_1.isIdentifierNode)(node.callee.property)) {
                            return node.callee.property.name === "then";
                        }
                    }
                }
            }
            return false;
        })?.node;
        if (!thenCallExpressionInGivenQuery) {
            const expression = rootCallExpression;
            const callExpression = {
                type: constants_1.NodeTypes.CallExpression,
                start: expression.start,
                end: expression.end + 7,
                callee: {
                    type: constants_1.NodeTypes.MemberExpression,
                    object: expression,
                    start: expression.start,
                    end: expression.end + 5,
                    property: {
                        type: constants_1.NodeTypes.Identifier,
                        name: "then",
                        start: expression.end + 1,
                        end: expression.end + 5,
                    },
                },
            };
            astWithComments.body[0].expression = callExpression;
            astWithComments.body[0].end = callExpression.end;
        }
        thenCallExpressionInGivenQuery = (0, acorn_walk_1.findNodeAt)(astWithComments, 0, undefined, function (type, node) {
            if ((0, index_1.isCallExpressionNode)(node)) {
                if ((0, index_1.isMemberExpressionNode)(node.callee)) {
                    if (node.callee.object === rootCallExpression) {
                        if ((0, index_1.isIdentifierNode)(node.callee.property)) {
                            return node.callee.property.name === "then";
                        }
                    }
                }
            }
            return false;
        })?.node;
        const thenBlockNode = (0, index_1.getAST)(thenBlock, {
            locations: true,
            ranges: true,
            onComment: commentArray,
        });
        const thenBlockNodeWithComments = (0, index_1.attachCommentsToAst)(thenBlockNode, commentArray);
        if (thenCallExpressionInGivenQuery) {
            // @ts-expect-error: types not matched
            thenCallExpressionInGivenQuery.arguments = [
                thenBlockNodeWithComments.body[0].expression,
            ];
        }
        requiredQuery = `${(0, astring_1.generate)(astWithComments, { comments: true }).trim()}`;
        return requiredQuery;
    }
    catch (error) {
        return requiredQuery;
    }
}
exports.setThenBlockInQuery = setThenBlockInQuery;
function setCatchBlockInQuery(value, catchBlock, evaluationVersion) {
    let ast = { end: 0, start: 0, type: "" };
    const commentArray = [];
    let requiredQuery = "";
    catchBlock = catchBlock || "() => {}";
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            onComment: commentArray,
        });
        const astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
        const rootCallExpression = findRootCallExpression(ast);
        let catchCallExpressionInGivenQuery = findNodeWithCalleeAndProperty(astWithComments, rootCallExpression, "catch");
        if (!catchCallExpressionInGivenQuery) {
            const thenCallExpressionInGivenQuery = findNodeWithCalleeAndProperty(astWithComments, rootCallExpression, "then");
            catchCallExpressionInGivenQuery =
                thenCallExpressionInGivenQuery &&
                    findNodeWithCalleeAndProperty(astWithComments, thenCallExpressionInGivenQuery, "catch");
            if (!catchCallExpressionInGivenQuery) {
                const expression = (0, json_1.klona)(thenCallExpressionInGivenQuery ?? rootCallExpression);
                const callExpression = {
                    type: constants_1.NodeTypes.CallExpression,
                    start: expression.start,
                    end: expression.end + 8,
                    callee: {
                        type: constants_1.NodeTypes.MemberExpression,
                        start: expression.start,
                        end: expression.end + 6,
                        object: expression,
                        property: {
                            type: constants_1.NodeTypes.Identifier,
                            name: "catch",
                            start: expression.end + 2,
                            end: expression.end + 7,
                        },
                    },
                };
                catchCallExpressionInGivenQuery = callExpression;
                astWithComments.body[0].expression = catchCallExpressionInGivenQuery;
            }
        }
        const catchBlockNode = (0, index_1.getAST)(catchBlock, {
            locations: true,
            ranges: true,
            onComment: commentArray,
        });
        const catchBlockNodeWithComments = (0, index_1.attachCommentsToAst)(catchBlockNode, commentArray);
        if (catchCallExpressionInGivenQuery) {
            // @ts-expect-error: types not matched
            catchCallExpressionInGivenQuery.arguments = [
                catchBlockNodeWithComments.body[0].expression,
            ];
        }
        requiredQuery = `${(0, astring_1.generate)(astWithComments, { comments: true }).trim()}`;
        return requiredQuery;
    }
    catch (error) {
        return requiredQuery;
    }
}
exports.setCatchBlockInQuery = setCatchBlockInQuery;
function getFunctionArguments(value, evaluationVersion) {
    let ast = { end: 0, start: 0, type: "" };
    const commentArray = [];
    const argumentsArray = [];
    let astWithComments;
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            onComment: commentArray,
        });
        astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
    }
    catch (error) {
        return "";
    }
    const rootCallExpression = findRootCallExpression(astWithComments);
    const args = rootCallExpression.arguments || [];
    for (const argument of args) {
        argumentsArray.push((0, astring_1.generate)(argument));
    }
    return argumentsArray.join(", ");
}
exports.getFunctionArguments = getFunctionArguments;
function getFunctionNameFromJsObjectExpression(value, evaluationVersion) {
    let ast = { end: 0, start: 0, type: "" };
    const commentArray = [];
    let functionName = "";
    let astWithComments;
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            onComment: commentArray,
        });
        astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
    }
    catch (error) {
        return functionName;
    }
    const rootCallExpression = findRootCallExpression(astWithComments);
    if (rootCallExpression && (0, index_1.isCallExpressionNode)(rootCallExpression)) {
        if ((0, index_1.isMemberExpressionNode)(rootCallExpression.callee)) {
            if ((0, index_1.isIdentifierNode)(rootCallExpression.callee.property)) {
                functionName = rootCallExpression.callee.property.name;
            }
        }
    }
    return functionName;
}
exports.getFunctionNameFromJsObjectExpression = getFunctionNameFromJsObjectExpression;
// function to get all call expressions in a given query
function getCallExpressions(value, evaluationVersion) {
    let ast = { end: 0, start: 0, type: "" };
    const commentArray = [];
    const callExpressions = [];
    let astWithComments;
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(value, evaluationVersion);
        ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            onComment: commentArray,
        });
        astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
    }
    catch (error) {
        return callExpressions;
    }
    (0, acorn_walk_1.simple)(astWithComments, {
        CallExpression(node) {
            callExpressions.push({
                code: (0, astring_1.generate)(node).trim(),
                callee: (0, astring_1.generate)(node.callee).trim(),
                arguments: node.arguments.map((argument) => (0, astring_1.generate)(argument).trim()),
            });
        },
    });
    return callExpressions;
}
exports.getCallExpressions = getCallExpressions;
function findRootCallExpression(ast) {
    const callExpressions = [];
    (0, acorn_walk_1.simple)(ast, {
        CallExpression(node) {
            if ((0, index_1.isCallExpressionNode)(node))
                callExpressions.push(node);
        },
    });
    /**
     * rootCallExpression should have the smallest start offset.
     * In case there are multiple CallExpressions with the same start offset,
     * pick the one the that has the least end offset.
     */
    let rootCallExpression = callExpressions[0];
    for (const ce of callExpressions) {
        if (rootCallExpression.start === ce.start) {
            rootCallExpression =
                ce.end < rootCallExpression.end ? ce : rootCallExpression;
        }
        else if (rootCallExpression.start > ce.start) {
            rootCallExpression = ce;
        }
    }
    return rootCallExpression;
}
function findNodeWithCalleeAndProperty(ast, callee, property) {
    if (!ast || !callee || !property)
        return undefined;
    return (0, acorn_walk_1.findNodeAt)(ast, 0, undefined, function (type, node) {
        if ((0, index_1.isCallExpressionNode)(node)) {
            if ((0, index_1.isMemberExpressionNode)(node.callee)) {
                if (node.callee.object === callee) {
                    if ((0, index_1.isIdentifierNode)(node.callee.property)) {
                        return node.callee.property.name === property;
                    }
                }
            }
        }
        return false;
    })?.node;
}
function getFunctionParams(code, evaluationVersion) {
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(code, evaluationVersion);
        code = `let a = ${sanitizedScript.trim()}`;
        const ast = (0, index_1.getAST)(code, {
            locations: true,
            ranges: true,
        });
        // @ts-expect-error: types not matched
        const functionExpression = ast.body[0].declarations[0].init;
        const params = functionExpression.params?.map((param) => (0, astring_1.generate)(param).trim()) ||
            [];
        return params;
    }
    catch (e) {
        return [];
    }
}
exports.getFunctionParams = getFunctionParams;
function getQueryParam(code, number, evaluationVersion) {
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(code, evaluationVersion);
        const ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
        });
        const rootCallExpression = findRootCallExpression(ast);
        if (!rootCallExpression)
            return `{{ {} }}`;
        const args = rootCallExpression.arguments;
        if (!args || args.length === 0)
            return `{{{}}}`;
        const firstArg = args[0] || {};
        if (firstArg.type && !(0, index_1.isTypeOfFunction)(firstArg.type)) {
            return (0, exports.getTextArgumentAtPosition)(code, 0, evaluationVersion);
        }
        const thirdArg = args[2] || {};
        if (thirdArg.type && !(0, index_1.isTypeOfFunction)(thirdArg.type)) {
            return (0, exports.getTextArgumentAtPosition)(code, 2, evaluationVersion);
        }
        return `{{{}}}`;
    }
    catch (e) {
        return `{{{}}}`;
    }
}
exports.getQueryParam = getQueryParam;
function setQueryParam(code, value, position, evaluationVersion) {
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(code, evaluationVersion);
        const ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
        });
        const rootCallExpression = findRootCallExpression(ast);
        if (!rootCallExpression)
            return code;
        if (position === 0) {
            rootCallExpression.arguments = [];
            code = (0, astring_1.generate)(ast);
            return (0, exports.setObjectAtPosition)(code, value, position, evaluationVersion);
        }
        else {
            const firstArg = rootCallExpression.arguments[0] || {};
            const secondArg = rootCallExpression.arguments[1] || {};
            if (firstArg && !(0, index_1.isTypeOfFunction)(firstArg.type)) {
                code = (0, exports.setCallbackFunctionField)(code, "() => {}", 0, evaluationVersion);
            }
            if (secondArg && !(0, index_1.isTypeOfFunction)(secondArg.type)) {
                code = (0, exports.setCallbackFunctionField)(code, "() => {}", 1, evaluationVersion);
            }
            return (0, exports.setObjectAtPosition)(code, value, 2, evaluationVersion);
        }
    }
    catch (e) {
        return code;
    }
}
exports.setQueryParam = setQueryParam;
function checkIfThenBlockExists(code, evaluationVersion) {
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(code, evaluationVersion);
        const ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
        });
        const rootCallExpression = findRootCallExpression(ast);
        if (!rootCallExpression)
            return code;
        let thenBlock = findNodeWithCalleeAndProperty(ast, rootCallExpression, "then");
        if (thenBlock)
            return true;
        const catchBlock = findNodeWithCalleeAndProperty(ast, rootCallExpression, "catch");
        thenBlock = findNodeWithCalleeAndProperty(ast, catchBlock, "then");
        if (thenBlock)
            return true;
        return false;
    }
    catch (e) {
        return false;
    }
}
exports.checkIfThenBlockExists = checkIfThenBlockExists;
function checkIfCatchBlockExists(code, evaluationVersion) {
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(code, evaluationVersion);
        const ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
        });
        const rootCallExpression = findRootCallExpression(ast);
        if (!rootCallExpression)
            return code;
        let catchBlock = findNodeWithCalleeAndProperty(ast, rootCallExpression, "catch");
        if (catchBlock)
            return true;
        const thenBlock = findNodeWithCalleeAndProperty(ast, rootCallExpression, "then");
        catchBlock = findNodeWithCalleeAndProperty(ast, thenBlock, "catch");
        if (catchBlock)
            return true;
        return false;
    }
    catch (e) {
        return false;
    }
}
exports.checkIfCatchBlockExists = checkIfCatchBlockExists;
function checkIfArgumentExistAtPosition(code, position, evaluationVersion) {
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(code, evaluationVersion);
        const ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
        });
        const rootCallExpression = findRootCallExpression(ast);
        if (!rootCallExpression)
            return false;
        const args = rootCallExpression.arguments;
        if (!args || args.length === 0 || !args[position])
            return false;
        return true;
    }
    catch (e) {
        return false;
    }
}
exports.checkIfArgumentExistAtPosition = checkIfArgumentExistAtPosition;
function setGenericArgAtPostition(arg, code, position) {
    try {
        const commentArray = [];
        const argCommentArray = [];
        const sanitizedScript = (0, utils_1.sanitizeScript)(code, 2);
        const ast = (0, index_1.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
            onComment: commentArray,
        });
        arg = arg.trim();
        const astWithComments = (0, index_1.attachCommentsToAst)(ast, commentArray);
        let argAst;
        let argASTWithComments;
        let argNode;
        try {
            argAst = (0, index_1.getAST)(arg, {
                locations: true,
                ranges: true,
                onComment: argCommentArray,
            });
            argASTWithComments = (0, index_1.attachCommentsToAst)(argAst, argCommentArray);
            if ((0, index_1.isBlockStatementNode)(argASTWithComments.body[0])) {
                throw "Object interpretted as Block statement";
            }
            argNode = argASTWithComments.body[0].expression;
        }
        catch (e) {
            // If the arg is { a: 2 }, ast will BlockStatement and would end up here.
            // If the arg is { a: 2, b: 3 }, ast will throw error and would end up here.
            argAst = (0, index_1.getAST)(`var temp = ${arg}`, {
                locations: true,
                ranges: true,
                onComment: argCommentArray,
            });
            argASTWithComments = (0, index_1.attachCommentsToAst)(argAst, argCommentArray);
            argNode = argASTWithComments.body[0].declarations[0].init;
        }
        const rootCallExpression = findRootCallExpression(astWithComments);
        if (!rootCallExpression)
            return code;
        const args = rootCallExpression.arguments || [];
        args[position] = argNode;
        rootCallExpression.arguments = args;
        return (0, astring_1.generate)(ast).trim();
    }
    catch (e) {
        return code;
    }
}
exports.setGenericArgAtPostition = setGenericArgAtPostition;
//# sourceMappingURL=index.js.map