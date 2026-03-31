import type { DSLWidget, WidgetProps } from "./types";
export declare const DATA_BIND_REGEX_GLOBAL: RegExp;
export declare const DATA_BIND_REGEX: RegExp;
export declare const generateReactKey: ({ prefix, }?: {
    prefix?: string;
}) => string;
export declare const removeSpecialChars: (value: string, limit?: number) => string;
export declare const isDynamicValue: (value: string) => boolean;
export declare const stringToJS: (string: string) => string;
export declare const traverseDSLAndMigrate: (DSL: DSLWidget, migrateFn: (widget: WidgetProps) => void) => DSLWidget;
//# sourceMappingURL=utils.d.ts.map