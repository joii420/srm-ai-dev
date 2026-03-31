/**
 * Node.js stub for UITelemetry/generateTraces.
 * All tracing functions are no-op.
 */

export type OtlpSpan = {
  setAttribute: (...args: any[]) => void;
  end: (...args: any[]) => void;
};

export type SpanAttributes = Record<string, any>;

export const startRootSpan = (..._args: any[]): OtlpSpan | undefined => undefined;
export const startNestedSpan = (..._args: any[]): OtlpSpan | undefined => undefined;
export const endSpan = (..._args: any[]) => {};
export const setAttributesToSpan = (..._args: any[]) => {};
export const wrapFnWithParentTraceContext = (fn: any) => fn;
