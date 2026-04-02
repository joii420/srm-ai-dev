/**
 * Node.js stub: all Sentry-dependent performance tracking replaced with no-ops.
 * Preserves the enum and class interface for compatibility.
 */

export enum PerformanceTransactionName {
  DATA_TREE_EVALUATION = "DATA_TREE_EVALUATION",
  SET_EVALUATED_TREE = "SET_EVALUATED_TREE",
  EXECUTE_PAGE_LOAD_ACTIONS = "EXECUTE_PAGE_LOAD_ACTIONS",
  ENTITY_EXPLORER_ENTITY = "ENTITY_EXPLORER_ENTITY",
  ENTITY_EXPLORER = "ENTITY_EXPLORER",
  CLOSE_SIDE_PANE = "CLOSE_SIDE_PANE",
  OPEN_ACTION = "OPEN_ACTION",
  SIDE_BAR_MOUNT = "SIDE_BAR_MOUNT",
  EXECUTE_ACTION = "EXECUTE_ACTION",
  CHANGE_API_SAGA = "CHANGE_API_SAGA",
  SYNC_PARAMS_SAGA = "SYNC_PARAMS_SAGA",
  RUN_API_CLICK = "RUN_API_CLICK",
  RUN_API_SHORTCUT = "RUN_API_SHORTCUT",
  RUN_QUERY_CLICK = "RUN_QUERY_CLICK",
  RUN_QUERY_SHORTCUT = "RUN_QUERY_SHORTCUT",
  FETCH_ACTIONS_API = "FETCH_ACTIONS_API",
  FETCH_PAGE_LIST_API = "FETCH_PAGE_LIST_API",
  FETCH_PAGE_ACTIONS_API = "FETCH_PAGE_ACTIONS_API",
  FETCH_PAGE_API = "FETCH_PAGE_API",
  SAVE_PAGE_API = "SAVE_PAGE_API",
  UPDATE_ACTION_API = "UPDATE_ACTION_API",
  OPEN_PROPERTY_PANE = "OPEN_PROPERTY_PANE",
  REFACTOR_ACTION_NAME = "REFACTOR_ACTION_NAME",
  USER_ME_API = "USER_ME_API",
  SIGN_UP = "SIGN_UP",
  LOGIN_CLICK = "LOGIN_CLICK",
  INIT_EDIT_APP = "INIT_EDIT_APP",
  INIT_VIEW_APP = "INIT_VIEW_APP",
  SHOW_RESIZE_HANDLES = "SHOW_RESIZE_HANDLES",
  ROOT_TO_START_INIT = "!!!!!! root did mount ~ start init page",
  PAGE_SWITCH = "PAGE_SWITCH",
}

export interface PerfTag {
  name: string;
  value: string;
}

class PerformanceTracker {
  static startTracking(
    _eventName: PerformanceTransactionName,
    _data?: any,
    _skipLog?: boolean,
    _tags?: PerfTag[],
  ) {}

  static stopTracking(
    _eventName?: PerformanceTransactionName,
    _data?: any,
  ) {}

  static startAsyncTracking(
    _eventName: PerformanceTransactionName,
    _data?: any,
    _uniqueId?: string,
    _parentEventId?: string,
    _skipLog?: boolean,
  ) {}

  static stopAsyncTracking(
    _eventName: PerformanceTransactionName,
    _data?: any,
    _uniqueId?: string,
  ) {}
}

export default PerformanceTracker;
