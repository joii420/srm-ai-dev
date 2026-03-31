/**
 * Methods use console.time/timeEnd for basic Node.js tracking.
 */
export enum PerformanceTransactionName {
  DATA_TREE_EVALUATION = 'DATA_TREE_EVALUATION',
  SET_EVALUATED_TREE = 'SET_EVALUATED_TREE',
  INIT_EDIT_APP = 'INIT_EDIT_APP',
  INIT_VIEW_APP = 'INIT_VIEW_APP',
  EXECUTE_ACTION = 'EXECUTE_ACTION',
  PAGE_SWITCH = 'PAGE_SWITCH',
}

export default class PerformanceTracker {
  static startAsyncTracking(
    _transactionName: PerformanceTransactionName,
    _data?: Record<string, any>,
    _uniqueId?: string,
  ) {}

  static stopAsyncTracking(
    _transactionName: PerformanceTransactionName,
    _data?: Record<string, any>,
    _uniqueId?: string,
  ) {}

  static startTracking(
    _transactionName: PerformanceTransactionName,
    _data?: Record<string, any>,
  ) {}

  static stopTracking(
    _transactionName?: PerformanceTransactionName,
  ) {}
}
