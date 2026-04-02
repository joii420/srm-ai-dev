// Node.js: use createMemoryHistory instead of createBrowserHistory
// eslint-disable-next-line @typescript-eslint/no-var-requires
const createHistory = require("history").createMemoryHistory;
import type { History } from "history";

const history: History<AppsmithLocationState> = createHistory();
export default history;

export enum NavigationMethod {
  CommandClick = "CommandClick",
  EntityExplorer = "EntityExplorer",
  Omnibar = "Omnibar",
  Debugger = "Debugger",
  CanvasClick = "CanvasClick",
  ActionBackButton = "ActionBackButton",
  ContextSwitching = "ContextSwitching",
  AppSidebar = "AppSidebar",
  AppNavigation = "AppNavigation",
  PackageSidebar = "PackageSidebar",
  SegmentControl = "SegmentControl",
  EditorTabs = "EditorTabs",
  WorkflowSidebar = "WorkflowSidebar",
  SlashCommandHint = "SlashCommandHint",
}

export interface AppsmithLocationState {
  invokedBy?: NavigationMethod;
}
