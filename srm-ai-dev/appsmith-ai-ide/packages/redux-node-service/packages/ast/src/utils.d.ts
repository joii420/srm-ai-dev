import type { PropertyNode } from "../index";
export declare function sanitizeScript(js: string, evaluationVersion: number): any;
export declare const isTrueObject: (item: unknown) => item is Record<string, unknown>;
export declare const getNameFromPropertyNode: (node: PropertyNode) => string;
interface Position {
    line: number;
    ch: number;
}
export declare const extractContentByPosition: (content: string, position: {
    from: Position;
    to: Position;
}) => string;
export declare const getStringValue: (inputValue: string | number | boolean | RegExp) => string | number;
export {};
//# sourceMappingURL=utils.d.ts.map