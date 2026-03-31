import type { functionParam } from "../index";
export declare const jsObjectDeclaration: string;
export interface JSPropertyPosition {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    keyStartLine: number;
    keyEndLine: number;
    keyStartColumn: number;
    keyEndColumn: number;
}
interface BaseJSProperty {
    key: string;
    value: string;
    type: string;
    position: Partial<JSPropertyPosition>;
    rawContent: string;
}
export type JSFunctionProperty = BaseJSProperty & {
    arguments: functionParam[];
    isMarkedAsync: boolean;
};
export type JSVarProperty = BaseJSProperty;
export type TParsedJSProperty = JSVarProperty | JSFunctionProperty;
export declare const isJSFunctionProperty: (t: TParsedJSProperty) => t is JSFunctionProperty;
export declare const parseJSObject: (code: string) => {
    parsedObject: TParsedJSProperty[];
    success: boolean;
};
export {};
//# sourceMappingURL=index.d.ts.map