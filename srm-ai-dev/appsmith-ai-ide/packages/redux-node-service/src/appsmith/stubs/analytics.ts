/**
 * Stub for AnalyticsUtil (used by 27+ saga files).
 * All methods are no-op in Node.js data processing mode.
 */
const AnalyticsUtil = {
  logEvent: (..._args: any[]) => {},
  identifyUser: (..._args: any[]) => {},
  getAnonymousId: () => 'node-anonymous',
  reset: () => {},
  setUserProperties: (..._args: any[]) => {},
  removeAnalytics: () => {},
  initializeSmartlook: () => {},
  initializeSegment: () => {},
  logError: (..._args: any[]) => {},
};

export default AnalyticsUtil;
