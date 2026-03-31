import type { Node } from "acorn";
import type { MemberExpressionNode } from "../index";
import type { PeekOverlayExpressionIdentifierOptions } from "./index";
export declare const isPositionWithinNode: (node: Node, pos: number) => boolean;
export declare const getExpressionStringAtPos: (node: Node, pos: number, options?: PeekOverlayExpressionIdentifierOptions, replaceThisExpression?: boolean) => string | undefined;
export declare const replaceThisinMemberExpression: (node: MemberExpressionNode, options: PeekOverlayExpressionIdentifierOptions) => MemberExpressionNode;
//# sourceMappingURL=utils.d.ts.map