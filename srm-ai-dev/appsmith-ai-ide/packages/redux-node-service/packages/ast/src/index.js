"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemberExpressionObjectFromProperty = exports.isFunctionPresent = exports.extractExpressionsFromCode = exports.isTypeOfFunction = exports.getFunctionalParamsFromNode = exports.entityRefactorFromCode = exports.extractIdentifierInfoFromCode = exports.attachCommentsToAst = exports.getAST = exports.wrapCode = exports.isPropertyAFunctionNode = exports.isExportDefaultDeclarationNode = exports.isExpressionStatementNode = exports.isBlockStatementNode = exports.isCallExpressionNode = exports.isPropertyNode = exports.isLiteralNode = exports.isObjectExpression = exports.isAssignmentExpression = exports.isArrowFunctionExpression = exports.isVariableDeclarator = exports.isBinaryExpressionNode = exports.isAwaitExpressionNode = exports.isConditionalExpressionNode = exports.isThisExpressionNode = exports.isMemberExpressionNode = exports.isIdentifierNode = void 0;
const acorn_1 = require("acorn");
const acorn_walk_1 = require("acorn-walk");
const constants_1 = require("./constants");
const lodash_1 = require("lodash");
const utils_1 = require("./utils");
const jsObject_1 = require("./jsObject");
const astravel_1 = require("astravel");
const astring_1 = require("astring");
/* We need these functions to typescript casts the nodes with the correct types */
const isIdentifierNode = (node) => {
    return node.type === constants_1.NodeTypes.Identifier;
};
exports.isIdentifierNode = isIdentifierNode;
const isMemberExpressionNode = (node) => {
    return node.type === constants_1.NodeTypes.MemberExpression;
};
exports.isMemberExpressionNode = isMemberExpressionNode;
const isThisExpressionNode = (node) => {
    return node.type === constants_1.NodeTypes.ThisExpression;
};
exports.isThisExpressionNode = isThisExpressionNode;
const isConditionalExpressionNode = (node) => node.type === constants_1.NodeTypes.ConditionalExpression;
exports.isConditionalExpressionNode = isConditionalExpressionNode;
const isAwaitExpressionNode = (node) => node.type === constants_1.NodeTypes.AwaitExpression;
exports.isAwaitExpressionNode = isAwaitExpressionNode;
const isBinaryExpressionNode = (node) => {
    return node.type === constants_1.NodeTypes.BinaryExpression;
};
exports.isBinaryExpressionNode = isBinaryExpressionNode;
const isVariableDeclarator = (node) => {
    return node.type === constants_1.NodeTypes.VariableDeclarator;
};
exports.isVariableDeclarator = isVariableDeclarator;
const isFunctionDeclaration = (node) => {
    return node.type === constants_1.NodeTypes.FunctionDeclaration;
};
const isFunctionExpression = (node) => {
    return node.type === constants_1.NodeTypes.FunctionExpression;
};
const isArrowFunctionExpression = (node) => {
    return node.type === constants_1.NodeTypes.ArrowFunctionExpression;
};
exports.isArrowFunctionExpression = isArrowFunctionExpression;
const isAssignmentExpression = (node) => {
    return node.type === constants_1.NodeTypes.AssignmentExpression;
};
exports.isAssignmentExpression = isAssignmentExpression;
const isObjectExpression = (node) => {
    return node.type === constants_1.NodeTypes.ObjectExpression;
};
exports.isObjectExpression = isObjectExpression;
const isAssignmentPatternNode = (node) => {
    return node.type === constants_1.NodeTypes.AssignmentPattern;
};
const isLiteralNode = (node) => {
    return node.type === constants_1.NodeTypes.Literal;
};
exports.isLiteralNode = isLiteralNode;
const isPropertyNode = (node) => {
    return node.type === constants_1.NodeTypes.Property;
};
exports.isPropertyNode = isPropertyNode;
const isCallExpressionNode = (node) => {
    return node.type === constants_1.NodeTypes.CallExpression;
};
exports.isCallExpressionNode = isCallExpressionNode;
const isBlockStatementNode = (node) => {
    return node.type === constants_1.NodeTypes.BlockStatement;
};
exports.isBlockStatementNode = isBlockStatementNode;
const isExpressionStatementNode = (node) => {
    return node.type === constants_1.NodeTypes.ExpressionStatement;
};
exports.isExpressionStatementNode = isExpressionStatementNode;
const isExportDefaultDeclarationNode = (node) => {
    return node.type === constants_1.NodeTypes.ExportDefaultDeclaration;
};
exports.isExportDefaultDeclarationNode = isExportDefaultDeclarationNode;
const isPropertyAFunctionNode = (node) => {
    return (node.type === constants_1.NodeTypes.ArrowFunctionExpression ||
        node.type === constants_1.NodeTypes.FunctionExpression);
};
exports.isPropertyAFunctionNode = isPropertyAFunctionNode;
const isArrayAccessorNode = (node) => {
    return ((0, exports.isMemberExpressionNode)(node) &&
        node.computed &&
        (0, exports.isLiteralNode)(node.property) &&
        (0, lodash_1.isFinite)(node.property.value));
};
const wrapCode = (code) => {
    return `
    (function() {
      return ${code}
    })
  `;
};
exports.wrapCode = wrapCode;
//Tech-debt: should upgrade this to better logic
//Used slice for a quick resolve of critical bug
const unwrapCode = (code) => {
    const unwrapedCode = code.slice(32);
    return unwrapedCode.slice(0, -10);
};
const getFunctionalParamNamesFromNode = (node) => {
    return Array.from((0, exports.getFunctionalParamsFromNode)(node)).map((functionalParam) => functionalParam.paramName);
};
// Memoize the ast generation code to improve performance.
// Since this will be used by both the server and the client, we want to prevent regeneration of ast
// for the the same code snippet
const getAST = (code, options) => (0, acorn_1.parse)(code, { ...options, ecmaVersion: constants_1.ECMA_VERSION });
exports.getAST = getAST;
const attachCommentsToAst = (ast, commentArray) => {
    return (0, astravel_1.attachComments)(ast, commentArray);
};
exports.attachCommentsToAst = attachCommentsToAst;
const extractIdentifierInfoFromCode = (code, evaluationVersion, invalidIdentifiers) => {
    let ast = { end: 0, start: 0, type: "" };
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(code, evaluationVersion);
        /* wrapCode - Wrapping code in a function, since all code/script get wrapped with a function during evaluation.
           Some syntax won't be valid unless they're at the RHS of a statement.
           Since we're assigning all code/script to RHS during evaluation, we do the same here.
           So that during ast parse, those errors are neglected.
        */
        /* e.g. IIFE without braces
          function() { return 123; }() -> is invalid
          let result = function() { return 123; }() -> is valid
        */
        const wrappedCode = (0, exports.wrapCode)(sanitizedScript);
        ast = (0, exports.getAST)(wrappedCode);
        const { functionalParams, references, variableDeclarations } = ancestorWalk(ast);
        const referencesArr = Array.from(references).filter((reference) => {
            // To remove references derived from declared variables and function params,
            // We extract the topLevelIdentifier Eg. Api1.name => Api1
            const topLevelIdentifier = (0, lodash_1.toPath)(reference)[0];
            return !(functionalParams.has(topLevelIdentifier) ||
                variableDeclarations.has(topLevelIdentifier) ||
                (0, lodash_1.has)(invalidIdentifiers, topLevelIdentifier));
        });
        return {
            references: referencesArr,
            functionalParams: Array.from(functionalParams),
            variables: Array.from(variableDeclarations),
        };
    }
    catch (e) {
        if (e instanceof SyntaxError) {
            // Syntax error. Ignore and return empty list
            return {
                references: [],
                functionalParams: [],
                variables: [],
            };
        }
        throw e;
    }
};
exports.extractIdentifierInfoFromCode = extractIdentifierInfoFromCode;
const entityRefactorFromCode = (script, oldName, newName, isJSObject, evaluationVersion, invalidIdentifiers) => {
    //Sanitizing leads to removal of special charater.
    //Hence we are not sanatizing the script. Fix(#18492)
    //If script is a JSObject then replace export default to decalartion.
    if (isJSObject)
        script = jsObjectToCode(script);
    else
        script = (0, exports.wrapCode)(script);
    let ast = { end: 0, start: 0, type: "" };
    //Copy of script to refactor
    let refactorScript = script;
    //Difference in length of oldName and newName
    const nameLengthDiff = newName.length - oldName.length;
    //Offset index used for deciding location of oldName.
    let refactorOffset = 0;
    //Count of refactors on the script
    let refactorCount = 0;
    try {
        ast = (0, exports.getAST)(script);
        const { functionalParams, identifierList, references, variableDeclarations, } = ancestorWalk(ast);
        const identifierArray = Array.from(identifierList);
        //To handle if oldName has property ("JSObject.myfunc")
        const oldNameArr = oldName.split(".");
        const referencesArr = Array.from(references).filter((reference) => {
            // To remove references derived from declared variables and function params,
            // We extract the topLevelIdentifier Eg. Api1.name => Api1
            const topLevelIdentifier = (0, lodash_1.toPath)(reference)[0];
            return !(functionalParams.has(topLevelIdentifier) ||
                variableDeclarations.has(topLevelIdentifier) ||
                (0, lodash_1.has)(invalidIdentifiers, topLevelIdentifier));
        });
        //Traverse through all identifiers in the script
        identifierArray.forEach((identifier) => {
            if (identifier.name === oldNameArr[0]) {
                let index = 0;
                while (index < referencesArr.length) {
                    if (identifier.name === referencesArr[index].split(".")[0]) {
                        //Replace the oldName by newName
                        //Get start index from node and get subarray from index 0 till start
                        //Append above with new name
                        //Append substring from end index from the node till end of string
                        //Offset variable is used to alter the position based on `refactorOffset`
                        //In case of nested JS action get end postion fro the property.
                        ///Default end index
                        let endIndex = identifier.end;
                        const propertyNode = identifier.property;
                        //Flag variable : true if property should be updated
                        //false if property should not be updated
                        const propertyCondFlag = oldNameArr.length > 1 &&
                            propertyNode &&
                            oldNameArr[1] === propertyNode.name;
                        //Condition to validate if Identifier || Property should be updated??
                        if (oldNameArr.length === 1 || propertyCondFlag) {
                            //Condition to extend end index in case of property match
                            if (propertyCondFlag && propertyNode) {
                                endIndex = propertyNode.end;
                            }
                            refactorScript =
                                refactorScript.substring(0, identifier.start + refactorOffset) +
                                    newName +
                                    refactorScript.substring(endIndex + refactorOffset);
                            refactorOffset += nameLengthDiff;
                            ++refactorCount;
                            //We are only looking for one match in refrence for the identifier name.
                            break;
                        }
                    }
                    index++;
                }
            }
        });
        //If script is a JSObject then revert decalartion to export default.
        if (isJSObject)
            refactorScript = jsCodeToObject(refactorScript);
        else
            refactorScript = unwrapCode(refactorScript);
        return {
            isSuccess: true,
            body: { script: refactorScript, refactorCount },
        };
    }
    catch (e) {
        if (e instanceof SyntaxError) {
            // Syntax error. Ignore and return empty list
            return { isSuccess: false, body: { error: "Syntax Error" } };
        }
        throw e;
    }
};
exports.entityRefactorFromCode = entityRefactorFromCode;
const getFunctionalParamsFromNode = (node, needValue = false) => {
    const functionalParams = new Set();
    node.params.forEach((paramNode) => {
        if ((0, exports.isIdentifierNode)(paramNode)) {
            functionalParams.add({
                paramName: paramNode.name,
                defaultValue: undefined,
            });
        }
        else if (isAssignmentPatternNode(paramNode)) {
            if ((0, exports.isIdentifierNode)(paramNode.left)) {
                const paramName = paramNode.left.name;
                if (!needValue) {
                    functionalParams.add({ paramName, defaultValue: undefined });
                }
                else {
                    // figure out how to get value of paramNode.right for each node type
                    // currently we don't use params value, hence skipping it
                    // functionalParams.add({
                    //   defaultValue: paramNode.right.value,
                    // });
                }
            }
        }
    });
    return functionalParams;
};
exports.getFunctionalParamsFromNode = getFunctionalParamsFromNode;
const constructFinalMemberExpIdentifier = (node, child = "") => {
    const propertyAccessor = getPropertyAccessor(node.property);
    if ((0, exports.isIdentifierNode)(node.object)) {
        return `${node.object.name}${propertyAccessor}${child}`;
    }
    else {
        const propertyAccessor = getPropertyAccessor(node.property);
        const nestedChild = `${propertyAccessor}${child}`;
        return constructFinalMemberExpIdentifier(node.object, nestedChild);
    }
};
const getPropertyAccessor = (propertyNode) => {
    if ((0, exports.isIdentifierNode)(propertyNode)) {
        return `.${propertyNode.name}`;
    }
    else if ((0, exports.isLiteralNode)(propertyNode) && (0, lodash_1.isString)(propertyNode.value)) {
        // is string literal search a['b']
        return `.${propertyNode.value}`;
    }
    else if ((0, exports.isLiteralNode)(propertyNode) && (0, lodash_1.isFinite)(propertyNode.value)) {
        // is array index search - a[9]
        return `[${propertyNode.value}]`;
    }
};
const isTypeOfFunction = (type) => {
    return (type === constants_1.NodeTypes.ArrowFunctionExpression ||
        type === constants_1.NodeTypes.FunctionExpression);
};
exports.isTypeOfFunction = isTypeOfFunction;
/** Function returns Invalid top-level member expressions from code
 * @param code
 * @param data
 * @param evaluationVersion
 * @returns information about all invalid property/method assessment in code
 * @example Given data {
 * JSObject1: {
 * name:"JSObject",
 * data:[]
 * },
 * Api1:{
 * name: "Api1",
 * data: []
 * }
 * },
 * For code {{Api1.name + JSObject.unknownProperty}}, function returns information about "JSObject.unknownProperty" node.
 */
const extractExpressionsFromCode = (code, data, evaluationVersion) => {
    const assignmentExpressionsData = new Set();
    const callExpressionsData = new Set();
    const memberCallExpressionData = new Set();
    const invalidTopLevelMemberExpressions = new Set();
    const variableDeclarations = new Set();
    let functionalParams = new Set();
    let ast = { end: 0, start: 0, type: "" };
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(code, evaluationVersion);
        const wrappedCode = (0, exports.wrapCode)(sanitizedScript);
        ast = (0, exports.getAST)(wrappedCode, { locations: true });
    }
    catch (e) {
        if (e instanceof SyntaxError) {
            // Syntax error. Ignore and return empty list
            return {
                invalidTopLevelMemberExpressionsArray: [],
                assignmentExpressionsData: [],
                callExpressionsData: [],
                memberCallExpressionData: [],
            };
        }
        throw e;
    }
    (0, acorn_walk_1.simple)(ast, {
        MemberExpression(node) {
            const { computed, object, property } = node;
            // We are only interested in top-level MemberExpression nodes
            // Eg. for Api1.data.name, we are only interested in Api1.data
            if (!(0, exports.isIdentifierNode)(object))
                return;
            if (!(object.name in data) || !(0, utils_1.isTrueObject)(data[object.name]))
                return;
            // For computed member expressions (assessed via [], eg. JSObject1["name"] ),
            // We are only interested in strings
            if ((0, exports.isLiteralNode)(property) &&
                (0, lodash_1.isString)(property.value) &&
                !(property.value in data[object.name])) {
                invalidTopLevelMemberExpressions.add({
                    object,
                    property,
                });
            }
            // We ignore computed member expressions if property is an identifier (JSObject[name])
            // This is because we can't statically determine what the value of the identifier might be.
            if ((0, exports.isIdentifierNode)(property) &&
                !computed &&
                !(property.name in data[object.name])) {
                invalidTopLevelMemberExpressions.add({
                    object,
                    property,
                });
            }
        },
        VariableDeclarator(node) {
            if ((0, exports.isVariableDeclarator)(node)) {
                variableDeclarations.add(node.id.name);
            }
        },
        FunctionDeclaration(node) {
            if (!isFunctionDeclaration(node))
                return;
            functionalParams = new Set([
                ...functionalParams,
                ...getFunctionalParamNamesFromNode(node),
            ]);
        },
        FunctionExpression(node) {
            if (!isFunctionExpression(node))
                return;
            functionalParams = new Set([
                ...functionalParams,
                ...getFunctionalParamNamesFromNode(node),
            ]);
        },
        ArrowFunctionExpression(node) {
            if (!(0, exports.isArrowFunctionExpression)(node))
                return;
            functionalParams = new Set([
                ...functionalParams,
                ...getFunctionalParamNamesFromNode(node),
            ]);
        },
        AssignmentExpression(node) {
            if (!(0, exports.isAssignmentExpression)(node) ||
                node.operator !== "=" ||
                !(0, exports.isMemberExpressionNode)(node.left))
                return;
            const { object, property } = node.left;
            assignmentExpressionsData.add({
                object,
                property,
                parentNode: node,
            });
        },
        CallExpression(node) {
            if ((0, exports.isCallExpressionNode)(node)) {
                if ((0, exports.isIdentifierNode)(node.callee)) {
                    callExpressionsData.add({
                        property: node.callee,
                        params: node.arguments,
                    });
                }
                if ((0, exports.isMemberExpressionNode)(node.callee)) {
                    const { object, property } = node.callee;
                    memberCallExpressionData.add({
                        object,
                        property,
                        parentNode: node,
                    });
                }
            }
        },
    });
    const invalidTopLevelMemberExpressionsArray = Array.from(invalidTopLevelMemberExpressions).filter((MemberExpression) => {
        return !(variableDeclarations.has(MemberExpression.object.name) ||
            functionalParams.has(MemberExpression.object.name));
    });
    return {
        invalidTopLevelMemberExpressionsArray,
        assignmentExpressionsData: [...assignmentExpressionsData],
        callExpressionsData: [...callExpressionsData],
        memberCallExpressionData: [...memberCallExpressionData],
    };
};
exports.extractExpressionsFromCode = extractExpressionsFromCode;
const ancestorWalk = (ast) => {
    //List of all Identifier nodes with their property(if exists).
    const identifierList = new Array();
    // List of all references found
    const references = new Set();
    // List of variables declared within the script. All identifiers and member expressions derived from declared variables will be removed
    const variableDeclarations = new Set();
    // List of functional params declared within the script. All identifiers and member expressions derived from functional params will be removed
    let functionalParams = new Set();
    /*
     * We do an ancestor walk on the AST in order to extract all references. For example, for member expressions and identifiers, we need to know
     * what surrounds the identifier (its parent and ancestors), ancestor walk will give that information in the callback
     * doc: https://github.com/acornjs/acorn/tree/master/acorn-walk
     */
    (0, acorn_walk_1.ancestor)(ast, {
        Identifier(node, ancestors) {
            /*
             * We are interested in identifiers. Due to the nature of AST, Identifier nodes can
             * also be nested inside MemberExpressions. For deeply nested object references, there
             * could be nesting of many MemberExpressions. To find the final reference, we will
             * try to find the top level MemberExpression that does not have a MemberExpression parent.
             * */
            let candidateTopLevelNode = node;
            let depth = ancestors.length - 2; // start "depth" with first parent
            while (depth > 0) {
                const parent = ancestors[depth];
                if ((0, exports.isMemberExpressionNode)(parent) &&
                    /* Member expressions that are "computed" (with [ ] search)
                       and the ones that have optional chaining ( a.b?.c )
                       will be considered top level node.
                       We will stop looking for further parents */
                    /* "computed" exception - isArrayAccessorNode
                       Member expressions that are array accessors with static index - [9]
                       will not be considered top level.
                       We will continue looking further. */
                    (!parent.computed || isArrayAccessorNode(parent)) &&
                    !parent.optional) {
                    candidateTopLevelNode = parent;
                    depth = depth - 1;
                }
                else {
                    // Top level found
                    break;
                }
            }
            //If parent is a Member expression then attach property to the Node.
            //else push Identifier Node.
            const parentNode = ancestors[ancestors.length - 2];
            if ((0, exports.isMemberExpressionNode)(parentNode)) {
                identifierList.push({
                    ...node,
                    property: parentNode.property,
                });
            }
            else
                identifierList.push(node);
            if ((0, exports.isIdentifierNode)(candidateTopLevelNode)) {
                // If the node is an Identifier, just save that
                references.add(candidateTopLevelNode.name);
            }
            else {
                // For MemberExpression Nodes, we will construct a final reference string and then add
                // it to the references list
                const memberExpIdentifier = constructFinalMemberExpIdentifier(candidateTopLevelNode);
                references.add(memberExpIdentifier);
            }
        },
        VariableDeclarator(node) {
            // keep a track of declared variables so they can be
            // removed from the final list of references
            if ((0, exports.isVariableDeclarator)(node)) {
                variableDeclarations.add(node.id.name);
            }
        },
        FunctionDeclaration(node) {
            // params in function declarations are also counted as references so we keep
            // track of them and remove them from the final list of references
            if (!isFunctionDeclaration(node))
                return;
            functionalParams = new Set([
                ...functionalParams,
                ...getFunctionalParamNamesFromNode(node),
            ]);
        },
        FunctionExpression(node) {
            // params in function expressions are also counted as references so we keep
            // track of them and remove them from the final list of references
            if (!isFunctionExpression(node))
                return;
            functionalParams = new Set([
                ...functionalParams,
                ...getFunctionalParamNamesFromNode(node),
            ]);
        },
        ArrowFunctionExpression(node) {
            // params in arrow function expressions are also counted as references so we keep
            // track of them and remove them from the final list of references
            if (!(0, exports.isArrowFunctionExpression)(node))
                return;
            functionalParams = new Set([
                ...functionalParams,
                ...getFunctionalParamNamesFromNode(node),
            ]);
        },
    });
    return {
        references,
        functionalParams,
        variableDeclarations,
        identifierList,
    };
};
//Replace export default by a variable declaration.
//This is required for acorn to parse code into AST.
const jsObjectToCode = (script) => {
    return script.replace(/export default/g, jsObject_1.jsObjectDeclaration);
};
//Revert the string replacement from 'jsObjectToCode'.
//variable declaration is replaced back by export default.
const jsCodeToObject = (script) => {
    return script.replace(jsObject_1.jsObjectDeclaration, "export default");
};
const isFunctionPresent = (script, evaluationVersion) => {
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(script, evaluationVersion);
        const ast = (0, exports.getAST)(sanitizedScript, {
            locations: true,
            ranges: true,
        });
        let isFunction = false;
        (0, acorn_walk_1.simple)(ast, {
            FunctionDeclaration() {
                isFunction = true;
            },
            FunctionExpression() {
                isFunction = true;
            },
            ArrowFunctionExpression() {
                isFunction = true;
            },
        });
        return isFunction;
    }
    catch (e) {
        return false;
    }
};
exports.isFunctionPresent = isFunctionPresent;
function getMemberExpressionObjectFromProperty(propertyName, code, evaluationVersion = 2) {
    if (!propertyName)
        return [];
    const memberExpressionObjects = new Set();
    let ast = { end: 0, start: 0, type: "" };
    try {
        const sanitizedScript = (0, utils_1.sanitizeScript)(code, evaluationVersion);
        const wrappedCode = (0, exports.wrapCode)(sanitizedScript);
        ast = (0, exports.getAST)(wrappedCode, { locations: true });
        (0, acorn_walk_1.simple)(ast, {
            MemberExpression(node) {
                const { object, property } = node;
                if (!(0, exports.isLiteralNode)(property) && !(0, exports.isIdentifierNode)(property))
                    return;
                const propName = (0, exports.isLiteralNode)(property)
                    ? property.value
                    : property.name;
                if (!(0, lodash_1.isNil)(propName) && (0, utils_1.getStringValue)(propName) === propertyName) {
                    const memberExpressionObjectString = (0, astring_1.generate)(object);
                    memberExpressionObjects.add(memberExpressionObjectString);
                }
            },
        });
        return Array.from(memberExpressionObjects);
    }
    catch (e) {
        return [];
    }
}
exports.getMemberExpressionObjectFromProperty = getMemberExpressionObjectFromProperty;
//# sourceMappingURL=index.js.map