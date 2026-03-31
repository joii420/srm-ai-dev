import { promisify } from "./utils/Promisify";

/**Right toolbar config */
function SetToolbarFnDescriptor(config: any) {
  return {
    type: "SET_TOOLBAR" as const,
    payload: config,
  };
}

export type TSetToolbarArgs = Parameters<typeof SetToolbarFnDescriptor>;
export type TSetToolbarDescription = ReturnType<typeof SetToolbarFnDescriptor>;

export type TSetToolbarActionType = TSetToolbarDescription["type"];

async function set_toolbar(...args: TSetToolbarArgs) {
  return promisify(SetToolbarFnDescriptor)(...args);
}
//get toolbar
function GetToolbarFnDescriptor(config: any) {
  return {
    type: "GET_TOOLBAR" as const,
    payload: config,
  };
}

export type TGetToolbarArgs = Parameters<typeof GetToolbarFnDescriptor>;
export type TGetToolbarDescription = ReturnType<typeof GetToolbarFnDescriptor>;

export type TGetToolbarActionType = TGetToolbarDescription["type"];

async function get_toolbar(...args: TGetToolbarArgs) {
  return promisify(GetToolbarFnDescriptor)(...args);
}
/** left bar config */

function SetBrowserFnDescriptor(config: any) {
  return {
    type: "SET_BROWSER" as const,
    payload: config,
  };
}

export type TSetBrowserArgs = Parameters<typeof SetBrowserFnDescriptor>;
export type TSetBrowserDescription = ReturnType<typeof SetBrowserFnDescriptor>;

export type TSetBrowserActionType = TSetBrowserDescription["type"];

async function set_browser(...args: TSetBrowserArgs) {
  return promisify(SetBrowserFnDescriptor)(...args);
}

export { set_toolbar, set_browser, get_toolbar };
