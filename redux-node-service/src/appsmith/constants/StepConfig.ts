import type { AppTheme } from "entities/AppTheming";
import { CONTAINER_GRID_PADDING, WIDGET_PADDING } from "./WidgetConstants";

export const STEP_SERVER = ""; // vvho: 改成空的
export const LOGIN_SERVER = "/";
export const SIGNOUT_SERVER = "/system/logout";

export const REMOVEKEY_SERVER = "/system/verify/token";
export const SUBMITFORM_SERVER = "/system/info/update";

export const REMOVE_SESSION = "/system/remove/session";

export const LAYOUT_SERVER = "/system/layout";
export const CONFIG_SERVER = "/system/configuration/";
export const CONTEXT_URL = "/script-engine/context/createContext";
// 代码编译为2.0的api
export const DEPLOY_URL = "/script-engine/appsmith/deploy/application";
//程序推送到外网
export const APPLICATION_SEND = "/script-engine/publish/application/send";
export const PACKAGE_SEND = "/script-engine/publish/package/send";
export const DATASOURCE_SEND = "/script-engine/publish/datasource/send";
export const COM_SEND = "/script-engine/publish/com/send";

// export const TEXT_URL = "/script-engine/appsmith/test";

export const SESSION_SERVER = "/system/create/session";
export const HOMETEXT_SERVER = "/system/session/env/";
export const GRANT_SERVER = "/system/grant/";
export const APPLICATION_SERVER = "/system/applications";
export const MAIN_SERVER = "/system/extension/step-func";
// export const SOCKET_SERVER = "ws://172.16.18.41:8000/online/";
// export const SOCKET_SERVER = "ws://192.168.27.124:8000/online/";
// export const SOCKET_SERVER = "ws://172.16.18.41:7000/online/";
// export const SOCKET_SERVER = "ws://192.168.27.124:8000/online/";
// export const SOCKET_SERVER = "wss://172.16.18.41:8427/online/";
export const SOCKET_SERVER = `${window.location.protocol.replace('http', 'ws')}//${window.location.host}/online/`;
//eval socket
export const SOCKET_SERVER_EVAL = "ws://192.168.27.124:8080/ws/";

// export const SOCKET_SERVER_EVAL = "ws://192.168.27.124:8005/online_test";
export const SOCKET_SERVER_TEST = "ws://172.16.40.206:8002/online/";
export enum MAIN_SERVER_TARGET {
  TOP_MENU = "top-menu",
  TOOLBAR = "toolbar",
  APP_MENU = "app-menu",
  APP_ANCHOR = "app-anchors",
  APP_LEFT_TITLE = "app-left-title",
  APP_RELATED = "app-related",
}
export type TargetServer = keyof typeof MAIN_SERVER_TARGET;

export const DEVELOPMENT = "DEVELOPMENT";
export const RXDBERRINFONAME = "OffLineInfoDB";

export const RowSelectAction = "set_browser_action";
export const NodeSelectAction = "set_default";

export const HEADERHEIGHT = 40;
export const LEFT_MENU_WIDTH = 240;
export const LEFT_MENU_COLLAPSED_WIDTH = 40;
// height of AnchorMenu
export const ANCHOR_MENU_HEIGHT = 32;
export const RIGHT_TOOLBAR_WIDTH = 32;
export const MAIN_CONTAINER_OFFSET = CONTAINER_GRID_PADDING + WIDGET_PADDING;
export const SCROLLBAR_KEEP_MARGIN = 1;
export const HEADER_TOTAL_HEIGHT = HEADERHEIGHT + ANCHOR_MENU_HEIGHT;

export const DEFAULT_THEME: AppTheme | any = {
  displayName: "",
  id: "",
  name: "",
  properties: {
    colors: {
      primaryColor: "#3b82f6",
      backgroundColor: "#eff6ff",
    },
    borderRadius: {
      appBorderRadius: "0.375rem",
    },
    boxShadow: {
      appBoxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    },
    fontFamily: {
      appFont: "Inter",
    },
  },

  created_by: "",
  created_at: "",
  config: {
    colors: {
      backgroundColor: "#F8FAFC",
      primaryColor: "",
      secondaryColor: "",
    },
    borderRadius: {},
    boxShadow: {},
    fontFamily: {},
  },

  stylesheet: {},
};

export const SERVER_PARAMS = (
  targetServer: TargetServer,
  params: Record<string, any>,
) => {
  return {
    key: "",
    type: "",
    host: {
      prod: "", // "发起的产品别",
      ip: "", // "本机ip ",
      lang: "", // "语言别",
      acct: "", // "用户账号",
      timestamp: "", // "",
      appid: "", // "",
      appmodule: "", // "当前程序号",
    },
    datakey: {
      EntId: "", // "企业号",
      CompanyId: "", // "营运据点",
      postDate: "", // "过账信息",
    },
    service: {
      ip: "", // "172.16.18.41:"",//8002",
      prod: "", // "产品别",
      id: "", // "区服",
      name: MAIN_SERVER_TARGET[targetServer],
    },
    payload: {
      std_data: {
        parameter: {
          lang: "", // " zh_CN",
          ...params,
        },
      },
    },
  };
};

export const initIDLEWarning = (data: any, type = "single") => {
  return type === "single"
    ? {
        actionId: null,
        code: "SYS-001",
        extend: "自定义信息aaa",
        message: {
          typeId: "3",
          type: data.title,
          info: data.content,
          proposal: "升级权限",
          program: "无（无）",
        },
        sqlerrd: {},
        replace: ["admin", "sysi100"],
        columns: [
          {
            date: "2023-06-09",
          },
          {
            program: "adzi140",
          },
          {
            tip: "拜拜",
          },
        ],
        errTitle: {
          "ERR-005": {
            tname: "信息编号",
            keyBoard: "",
          },
          "ERR-006": {
            tname: "自定义信息语句",
            keyBoard: "",
          },
          "ERR-007": {
            tname: "建议处理方式",
            keyBoard: "",
          },
          "ERR-008": {
            tname: "SQL信息",
            keyBoard: "",
          },
          "ERR-001": {
            tname: "类型",
            keyBoard: "",
          },
          "ERR-003": {
            tname: "隐藏错误详情",
            keyBoard: "q",
          },
          "ERR-002": {
            tname: "信息语句",
            keyBoard: "",
          },
          "ERR-004": {
            tname: "显示错误详情",
            keyBoard: "q",
          },
        },
        errStyle: {
          errColor: "rgb(191,191,0)",
          errIcon: "e-icons e-warning",
          errTipType: "warning",
          btnData: {
            "ERR-009": {
              btnName: data.confirm,
              keyBoard: "Enter",
              function: "",
            },
            "ERR-010": {
              btnName: "",
              keyBoard: "Escape",
            },
          },
        },
      }
    : {
        actionId: null,
        dataSource: data,
        errStyle: {
          errColor: "#0074c1",
          errIcon: "e-icons e-export",
          btnData: {
            "ERR-009": {
              btnName: "确定",
              keyBoard: "Enter",
            },
            "ERR-010": {
              btnName: "",
              keyBoard: "",
            },
            "ERR-011": {
              btnName: "导出",
            },
          },
        },
        fieldSource: [
          {
            field: "activeTime",
            columnType: "SFDATETIMEPICKER_WIDGET",
          },
          {
            field: "application",
            columnType: "SFTEXTBOX_WIDGET",
          },
          {
            field: "applicationName",
            columnType: "SFTEXTBOX_WIDGET",
          },
          // {
          //   field: "messageTag",
          //   columnType: "SFTEXTBOX_WIDGET",
          // },
          {
            field: "openTime",
            columnType: "SFDATETIMEPICKER_WIDGET",
          },
          // {
          //   field: "ps",
          //   columnType: "SFTEXTBOX_WIDGET",
          // },
          {
            field: "site",
            columnType: "SFTEXTBOX_WIDGET",
          },
          {
            field: "status",
            columnType: "SFTEXTBOX_WIDGET",
          },
          {
            field: "timeout",
            columnType: "SFTEXTBOX_WIDGET",
          },
          // {
          //   field: "us",
          //   columnType: "SFTEXTBOX_WIDGET",
          // },
        ],
      };
};

const LOG_IN_URL_KEY = "APP_LOG_IN_URL";

export const setLogInUrl = (url: string) => {
  localStorage.setItem(LOG_IN_URL_KEY, url);
};

export const getLogInUrl = () => {
  return localStorage.getItem(LOG_IN_URL_KEY);
};
