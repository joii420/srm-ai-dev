export declare const getTextArgumentAtPosition: (value: string, argNum: number, evaluationVersion: number) => string;
export declare const setTextArgumentAtPosition: (currentValue: string, changeValue: any, argNum: number, evaluationVersion: number) => string;
export declare const setCallbackFunctionField: (currentValue: string, changeValue: string, argNum: number, evaluationVersion: number) => string;
export declare const setObjectAtPosition: (currentValue: string, changeValue: any, argNum: number, evaluationVersion: number) => string;
export declare const getEnumArgumentAtPosition: (value: string, argNum: number, defaultValue: string, evaluationVersion: number) => string;
export declare const setEnumArgumentAtPosition: (currentValue: string, changeValue: string, argNum: number, evaluationVersion: number) => string;
export declare const getModalName: (value: string, evaluationVersion: number) => string;
export declare const setModalName: (currentValue: string, changeValue: string, evaluationVersion: number) => string;
export declare const getFuncExpressionAtPosition: (value: string, argNum: number, evaluationVersion: number) => string;
export declare const getFunction: (value: string, evaluationVersion: number) => string;
export declare const replaceActionInQuery: (query: string, changeAction: string, argNum: number, evaluationVersion: number) => string;
/**
 * This function gets the action blocks which are basically the individual expression statements in the code
 */
export declare function getActionBlocks(value: string, evaluationVersion: number): Array<string>;
/**
 * This function gets the action block top-level names
 */
export declare function canTranslateToUI(value: string, evaluationVersion: number): boolean;
export declare function getFunctionBodyStatements(value: string, evaluationVersion: number): Array<string>;
export declare function getMainAction(value: string, evaluationVersion: number): string;
export declare function getFunctionName(value: string, evaluationVersion: number): string;
export declare function getThenCatchBlocksFromQuery(value: string, evaluationVersion: number): Record<string, string>;
export declare function setThenBlockInQuery(value: string, thenBlock: string, evaluationVersion: number): string;
export declare function setCatchBlockInQuery(value: string, catchBlock: string, evaluationVersion: number): string;
export declare function getFunctionArguments(value: string, evaluationVersion: number): string;
export declare function getFunctionNameFromJsObjectExpression(value: string, evaluationVersion: number): string;
export declare function getCallExpressions(value: string, evaluationVersion: number): Array<any>;
export declare function getFunctionParams(code: string, evaluationVersion: number): any;
export declare function getQueryParam(code: string, number: number, evaluationVersion: number): string;
export declare function setQueryParam(code: string, value: string, position: number, evaluationVersion: number): string;
export declare function checkIfThenBlockExists(code: string, evaluationVersion: number): string | boolean;
export declare function checkIfCatchBlockExists(code: string, evaluationVersion: number): string | boolean;
export declare function checkIfArgumentExistAtPosition(code: string, position: number, evaluationVersion: number): boolean;
export declare function setGenericArgAtPostition(arg: string, code: string, position: number): string;
//# sourceMappingURL=index.d.ts.map