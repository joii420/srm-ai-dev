/**
 * Stub for UITelemetry modules.
 * All tracing functions are no-op in Node.js.
 */
export const startRootSpan = (..._args: any[]) => ({});
export const generateWebWorkerTraces = (..._args: any[]) => {};
export const startNestedSpan = (..._args: any[]) => ({});
export const endSpan = (..._args: any[]) => {};
export const generateTraces = (..._args: any[]) => {};
export const wrapFnWithParentTraceContext = (fn: any) => fn;

export default {
  startRootSpan,
  generateWebWorkerTraces,
  startNestedSpan,
  endSpan,
  generateTraces,
  wrapFnWithParentTraceContext,
};
