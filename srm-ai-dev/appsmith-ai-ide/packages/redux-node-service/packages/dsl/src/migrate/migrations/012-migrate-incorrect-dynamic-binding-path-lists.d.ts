import type { DSLWidget } from "../types";
export declare const WidgetHeightLimits: {
    MAX_HEIGHT_IN_ROWS: number;
    MIN_HEIGHT_IN_ROWS: number;
    MIN_CANVAS_HEIGHT_IN_ROWS: number;
};
export declare const PropertyPaneConfigTemplates: Record<string, any[]>;
export declare function convertFunctionsToString(config: any[]): any[];
export declare const addPropertyConfigIds: (config: any[]) => any[];
export declare function generatePropertyPaneSearchConfig(contentConfig: readonly any[], styleConfig: readonly any[]): any[];
export declare function addSearchConfigToPanelConfig(config: readonly any[]): any[];
export declare const migrateIncorrectDynamicBindingPathLists: (currentDSL: Readonly<DSLWidget>) => DSLWidget;
//# sourceMappingURL=012-migrate-incorrect-dynamic-binding-path-lists.d.ts.map