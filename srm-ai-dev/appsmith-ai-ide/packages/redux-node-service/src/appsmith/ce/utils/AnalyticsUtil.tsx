/**
 * AnalyticsUtil stub for Node.js — replaces browser analytics SDK.
 * All methods are no-op.
 */

export function getUserSource() {
  return "node";
}

export function getExtraTelemetryProps() {
  return {};
}

const AnalyticsUtil = {
  logEvent: (..._args: any[]) => {},
  identifyUser: (..._args: any[]) => {},
  getAnonymousId: () => "node-anonymous",
  reset: () => {},
  setUserProperties: (..._args: any[]) => {},
  removeAnalytics: () => {},
  initializeSmartlook: () => {},
  initializeSegment: () => {},
  logError: (..._args: any[]) => {},
  initInstanceId: (..._args: any[]) => {},
};

export default AnalyticsUtil;
