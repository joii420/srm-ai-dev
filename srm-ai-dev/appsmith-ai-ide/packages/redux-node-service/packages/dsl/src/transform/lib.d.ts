import type { FlattenedDSL, NestedDSL } from "./types";
export declare function flattenDSL<W>(nestedDSL: NestedDSL<W>): FlattenedDSL<W>;
export declare function nestDSL<W>(flattenedDSL: FlattenedDSL<W>, widgetId?: string): NestedDSL<W>;
//# sourceMappingURL=lib.d.ts.map