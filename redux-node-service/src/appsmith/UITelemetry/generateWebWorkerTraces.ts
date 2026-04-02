/**
 * Node.js stub for UITelemetry/generateWebWorkerTraces.
 * profileFn is critical — it wraps eval functions and must call fn() and return its result.
 */

export interface WebworkerSpanData {
  spanName: string;
  startTime: number;
  endTime: number;
  attributes: Record<string, any>;
}

export type SpanAttributes = Record<string, any>;

export const newWebWorkerSpanData = (
  spanName: string,
  _attributes: Record<string, any> = {},
): WebworkerSpanData => ({
  spanName,
  startTime: Date.now(),
  endTime: Date.now(),
  attributes: {},
});

export const profileFn = (
  _spanName: string,
  _attributes: any,
  _allSpans: any,
  fn: (...args: any[]) => any,
) => {
  return fn();
};

export const filterSpanData = (data: any) => data;
export const convertWebworkerSpansToRegularSpans = (..._args: any[]) => {};
