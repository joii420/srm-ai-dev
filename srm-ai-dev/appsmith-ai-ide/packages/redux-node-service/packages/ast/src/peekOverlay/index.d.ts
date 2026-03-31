import type { SourceType } from "../constants/ast";
export declare class PeekOverlayExpressionIdentifier {
    private parsedScript?;
    private options;
    constructor(options: PeekOverlayExpressionIdentifierOptions, script?: string);
    hasParsedScript(): boolean;
    updateScript(script: string): void;
    clearScript(): void;
    extractExpressionAtPosition(pos: number): Promise<string>;
}
export interface PeekOverlayExpressionIdentifierOptions {
    sourceType: SourceType;
    thisExpressionReplacement?: string;
}
//# sourceMappingURL=index.d.ts.map