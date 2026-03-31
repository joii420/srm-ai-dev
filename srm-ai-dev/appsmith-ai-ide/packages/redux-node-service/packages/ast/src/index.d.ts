import type { Node, SourceLocation, Options, Comment } from "acorn";
import { NodeTypes } from "./constants";
type Pattern = IdentifierNode | AssignmentPatternNode;
type Expression = Node;
export type ArgumentTypes = LiteralNode | ArrowFunctionExpressionNode | ObjectExpression | MemberExpressionNode | CallExpressionNode | BinaryExpressionNode | BlockStatementNode | IdentifierNode;
export interface MemberExpressionNode extends Node {
    type: NodeTypes.MemberExpression;
    object: MemberExpressionNode | IdentifierNode | CallExpressionNode;
    property: IdentifierNode | LiteralNode;
    computed: boolean;
    optional?: boolean;
}
export interface BinaryExpressionNode extends Node {
    type: NodeTypes.BinaryExpression;
    left: BinaryExpressionNode | IdentifierNode;
    right: BinaryExpressionNode | IdentifierNode;
}
export interface IdentifierNode extends Node {
    type: NodeTypes.Identifier;
    name: string;
}
interface VariableDeclaratorNode extends Node {
    type: NodeTypes.VariableDeclarator;
    id: IdentifierNode;
    init: Expression | null;
}
interface Function extends Node {
    id: IdentifierNode | null;
    params: Pattern[];
}
interface FunctionDeclarationNode extends Node, Function {
    type: NodeTypes.FunctionDeclaration;
}
interface FunctionExpressionNode extends Expression, Function {
    type: NodeTypes.FunctionExpression;
    async: boolean;
}
export interface ArrowFunctionExpressionNode extends Expression, Function {
    type: NodeTypes.ArrowFunctionExpression;
    async: boolean;
}
export interface ObjectExpression extends Expression {
    type: NodeTypes.ObjectExpression;
    properties: Array<PropertyNode>;
}
interface AssignmentPatternNode extends Node {
    type: NodeTypes.AssignmentPattern;
    left: Pattern;
}
export interface LiteralNode extends Node {
    type: NodeTypes.Literal;
    value: string | boolean | null | number | RegExp;
    raw: string;
}
export interface CallExpressionNode extends Node {
    type: NodeTypes.CallExpression;
    callee: CallExpressionNode | IdentifierNode | MemberExpressionNode;
    arguments: ArgumentTypes[];
}
export interface ThisExpressionNode extends Expression {
    type: "ThisExpression";
}
export interface ConditionalExpressionNode extends Expression {
    type: "ConditionalExpression";
    test: Expression;
    alternate: Expression;
    consequent: Expression;
}
export interface AwaitExpressionNode extends Expression {
    type: "AwaitExpression";
    argument: Expression;
}
export interface BlockStatementNode extends Node {
    type: "BlockStatement";
    body: [Node];
}
export interface PropertyNode extends Node {
    type: NodeTypes.Property;
    key: LiteralNode | IdentifierNode;
    value: Node;
    kind: "init" | "get" | "set";
}
export interface ExpressionStatement extends Node {
    type: "ExpressionStatement";
    expression: Expression;
}
export interface Program extends Node {
    type: "Program";
    body: [Directive | Statement];
}
export type Statement = Node;
export interface Directive extends ExpressionStatement {
    expression: LiteralNode;
    directive: string;
}
export interface ExportDefaultDeclarationNode extends Node {
    declaration: Node;
}
export type NodeWithLocation<NodeType> = NodeType & {
    loc: SourceLocation;
};
type AstOptions = Omit<Options, "ecmaVersion">;
interface EntityRefactorResponse {
    isSuccess: boolean;
    body: {
        script: string;
        refactorCount: number;
    } | {
        error: string;
    };
}
export declare const isIdentifierNode: (node: Node) => node is IdentifierNode;
export declare const isMemberExpressionNode: (node: Node) => node is MemberExpressionNode;
export declare const isThisExpressionNode: (node: Node) => node is ThisExpressionNode;
export declare const isConditionalExpressionNode: (node: Node) => node is ConditionalExpressionNode;
export declare const isAwaitExpressionNode: (node: Node) => node is AwaitExpressionNode;
export declare const isBinaryExpressionNode: (node: Node) => node is BinaryExpressionNode;
export declare const isVariableDeclarator: (node: Node) => node is VariableDeclaratorNode;
export declare const isArrowFunctionExpression: (node: Node) => node is ArrowFunctionExpressionNode;
export declare const isAssignmentExpression: (node: Node) => node is AssignmentExpressionNode;
export declare const isObjectExpression: (node: Node) => node is ObjectExpression;
export declare const isLiteralNode: (node: Node) => node is LiteralNode;
export declare const isPropertyNode: (node: Node) => node is PropertyNode;
export declare const isCallExpressionNode: (node: Node) => node is CallExpressionNode;
export declare const isBlockStatementNode: (node: Node) => node is BlockStatementNode;
export declare const isExpressionStatementNode: (node: Node) => node is ExpressionStatement;
export declare const isExportDefaultDeclarationNode: (node: Node) => node is ExportDefaultDeclarationNode;
export declare const isPropertyAFunctionNode: (node: Node) => node is ArrowFunctionExpressionNode | FunctionExpressionNode;
export declare const wrapCode: (code: string) => string;
export declare const getAST: (code: string, options?: AstOptions) => import("acorn").Program;
export declare const attachCommentsToAst: (ast: Node, commentArray: Array<Comment>) => any;
/**
 * An AST based extractor that fetches all possible references in a given
 * piece of code. We use this to get any references to the global entities in Appsmith
 * and create dependencies on them. If the reference was updated, the given piece of code
 * should run again.
 * @param code: The piece of script where references need to be extracted from
 */
export interface IdentifierInfo {
    references: string[];
    functionalParams: string[];
    variables: string[];
}
export declare const extractIdentifierInfoFromCode: (code: string, evaluationVersion: number, invalidIdentifiers?: Record<string, unknown>) => IdentifierInfo;
export declare const entityRefactorFromCode: (script: string, oldName: string, newName: string, isJSObject: boolean, evaluationVersion: number, invalidIdentifiers?: Record<string, unknown>) => EntityRefactorResponse;
export interface functionParam {
    paramName: string;
    defaultValue: unknown;
}
export declare const getFunctionalParamsFromNode: (node: FunctionDeclarationNode | FunctionExpressionNode | ArrowFunctionExpressionNode, needValue?: boolean) => Set<functionParam>;
export declare const isTypeOfFunction: (type: string) => boolean;
export interface MemberExpressionData {
    property: NodeWithLocation<IdentifierNode | LiteralNode>;
    object: NodeWithLocation<IdentifierNode>;
}
export interface AssignmentExpressionData {
    property: NodeWithLocation<IdentifierNode | LiteralNode>;
    object: NodeWithLocation<IdentifierNode | MemberExpressionNode>;
    parentNode: NodeWithLocation<AssignmentExpressionNode>;
}
export interface CallExpressionData {
    property: NodeWithLocation<IdentifierNode>;
    params: NodeWithLocation<MemberExpressionNode | LiteralNode>[];
}
export interface MemberCallExpressionData {
    property: NodeWithLocation<MemberExpressionNode | LiteralNode>;
    object: NodeWithLocation<MemberExpressionNode>;
    parentNode: NodeWithLocation<CallExpressionNode>;
}
export interface AssignmentExpressionNode extends Node {
    operator: string;
    left: Expression;
    Right: Expression;
}
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
export declare const extractExpressionsFromCode: (code: string, data: Record<string, any>, evaluationVersion: number) => {
    invalidTopLevelMemberExpressionsArray: MemberExpressionData[];
    assignmentExpressionsData: AssignmentExpressionData[];
    callExpressionsData: CallExpressionData[];
    memberCallExpressionData: MemberCallExpressionData[];
};
export declare const isFunctionPresent: (script: string, evaluationVersion: number) => boolean;
export declare function getMemberExpressionObjectFromProperty(propertyName: string, code: string, evaluationVersion?: number): string[];
export {};
//# sourceMappingURL=index.d.ts.map