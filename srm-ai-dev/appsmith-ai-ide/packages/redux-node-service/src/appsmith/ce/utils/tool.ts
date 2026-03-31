import { APP_STORE_NAMESPACE } from "constants/AppConstants";
import type { TargetServer } from "constants/StepConfig";
import {
  APPLICATION_SERVER,
  CONFIG_SERVER,
  DEVELOPMENT,
  HOMETEXT_SERVER,
  LAYOUT_SERVER,
  LOGIN_SERVER,
  MAIN_SERVER,
  REMOVE_SESSION,
  RXDBERRINFONAME,
  SERVER_PARAMS,
  SESSION_SERVER,
  SIGNOUT_SERVER,
  STEP_SERVER,
  SUBMITFORM_SERVER,
  CONTEXT_URL,
  DEPLOY_URL,
  setLogInUrl,
  getLogInUrl,
  APPLICATION_SEND,
  PACKAGE_SEND,
  DATASOURCE_SEND,
  COM_SEND,
} from "constants/StepConfig";
// import Api from "api/Api";
import { omit, pick } from "lodash";
import globalStore from "utils/GlobalStore";
import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import { useDispatch, useSelector } from "react-redux";
import { getApplicationData } from "selectors/onboardingSelectors";
import { matchViewerPath } from "@appsmith/constants/routes/appRoutes";
import rootStore from "store";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { getPageList } from "selectors/pageSelectors";
import { findItemByTravelTree } from "utils/treeUtils";
import { NAV_MAX_LENGTH } from "constants/AppViewConstants";
import { toast } from "../../stubs/toast";
import GlobalMessageHelper from "utils/GlobalMessageHelper/GlobalMessageHelper";
import { createPageKey } from "@appsmith/reducers/pagesReducer";
import localData from "utils/LocalData";
import ApplicationApi from "ce/api/ApplicationApi";

export const getPathParams = (
  seaechString?: string,
): Record<string, string> => {
  const urlParams = seaechString ?? window.location.search ?? "";
  if (window?.URLSearchParams) {
    return Object.fromEntries(new URLSearchParams(urlParams));
  }
  const list: Record<string, string> = urlParams
    .substring(1)
    .split("&")
    ?.reduce((prev, next) => {
      const item = next.split("=");
      if (item[0] && item[0].length !== 0) {
        (prev as Record<string, string>)[item[0]] = item[1];
      }
      return prev;
    }, {});

  return list;
};

const US_STORAGE_base_KEY = 'us__';
const getUsKey = (us: string) => `${US_STORAGE_base_KEY}${us}`;
const isUsStorageKey = (key: string) => key.startsWith(US_STORAGE_base_KEY);

export const getUsStorageByKey = (key: string) => {
  let data: any = {};
  try {
    data = JSON.parse(localStorage.getItem(key) ?? "{}");
  } catch (error) {
    data = {};
  }
  return data;
}

export const getUsStorage = (targetUs?: string) => {
  const us = targetUs ?? getPathParams().us;
  if (!us) return {};

  const usKey = getUsKey(us);
  return getUsStorageByKey(usKey);
}

const setUsStorage = (newValue: any) => {
  const { us } = getPathParams();
  if (!us) return;

  const usKey = getUsKey(us);
  const data = getUsStorage(us);
  localStorage.setItem(
    usKey,
    JSON.stringify({
      ...data,
      ...newValue,
    }),
  );
}

export const isUsStorageExist = (us: string) => !!getUsStorage(us).token;

export const setTokenStorage = (token: string, expired: number) => {
  setUsStorage({ token, expired });
};

export const getTokenStorage = (): string => {
  const { token } = getUsStorage();
  return token ?? "";
};

export const checkAliveUsStorage = () => {
  const now = new Date().getTime();
  Object.keys(localStorage).forEach(key => {
    // TODO: 临时删除旧系统us数据
    if (/^[0-9a-zA-Z]{33}$/.test(key)) {
      localStorage.removeItem(key);
      return;
    }
    // TODO: 临时删除旧系统us数据
    if (/^APPSMITH_LOCAL_STORE-[0-9a-zA-Z]+$/.test(key)) {
      localStorage.removeItem(key);
      return;
    }

    if (isUsStorageKey(key)) {
      const { expired } = getUsStorageByKey(key);
      if (!expired || now > expired) {
        localStorage.removeItem(key);
      }
    }
  });
}

// export const getUserKeys = (): Array<{
//   key: string;
//   value: Array<{
//     us: string;
//     token: unknown;
//   }>;
// }> => {
//   const cacheKey = Object.keys(localStorage);
//   return cacheKey
//     .filter((item) => item.includes(APP_STORE_NAMESPACE))
//     .map((i) => {
//       return {
//         key: i,
//         value: Object.entries(JSON.parse(localStorage.getItem(i) ?? ""))
//           .filter(([us, token]) => cacheKey.includes(us))
//           .map(([us, token]) => {
//             return {
//               us,
//               token,
//             };
//           }),
//       };
//     });
// };

// export const removeTokenBykeys = (
//   expiredList: Array<{ key: string; value: string[] }>,
// ) => {
//   expiredList.forEach((i) => {
//     i.value.forEach((val) => localStorage.removeItem(val));
//     const value = omit(JSON.parse(localStorage.getItem(i.key) ?? ""), i.value);
//     localStorage.setItem(i.key, JSON.stringify(value));
//   });
// };

// export const fetchUserKeys = (url: string) => {
//   const keys = getUserKeys();
//   fetch(url, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: getTokenStorage(),
//     },
//     body: JSON.stringify(keys),
//   })
//     .then((response) => response.json())
//     .then(({ data }) => removeTokenBykeys(data));
//   // .catch((error) => console.log("#### SERVER ERROR", error));
// };

/**********     profile form     *************/

export enum SubmitFormType {
  PASSWORD = "PASSWORD",
  LANG = "LANG",
  THEME = "THEME",
  AVATAR = "AVATAR",
}

export type SubmitFormTypeKeys = keyof typeof SubmitFormType;

export interface SubmitForm {
  type: Array<SubmitFormTypeKeys>;
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  lang?: string;
  theme?: string;
  avatar?: File;
}

/*********** 个人信息表单栏位文本接口************/
export interface SubmitFormKeysInfo {
  title: string;
  account: string;
  user: string;
  avatar: string;
  uploadImage: string;
  modifyPassword: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  language: string;
  theme: string;
  submit: string;
  oldPasswordValid: string;
  confirmPasswordValid: string;
}
/*********** 个人信息弹出框栏位文本接口************/
export interface ProfilePopupKeysInfo {
  edit: string;
  signOut: string;
}
/*********** 确认退出登录框栏位文本接口************/
export interface ConfirmWindowKeysInfo {
  confirmHeader: string;
  confirm: string;
  cancel: string;
}
/*********** 顶部菜单栏位文本接口************/
export interface TopMenuKeysInfo {
  logo: string;
  project: string;
  search: string;
}

/*********** 首页栏位文本接口************/
export interface HomePageKeysInfo
  extends SubmitFormKeysInfo,
    ProfilePopupKeysInfo,
    ConfirmWindowKeysInfo,
    TopMenuKeysInfo {}

/**
 * @param form 提交修改的表单信息
 */
export const submitModifiedForm = async (form: FormData) => {
  const response = await fetch(SUBMITFORM_SERVER, {
    method: "POST",
    body: form,
    headers: {
      Authorization: getTokenStorage(),
    },
  })
    .then((res) => res.json())
    .then((res) => res);
  return response;
};

export const signOut = (targetUrl?: string) => {
  window.location.href = targetUrl ?? getLogInUrl() ?? LOGIN_SERVER;
};

// const deleteRXdbDatabase = async () => {
//   const { ps, us } = getPathParams();
//   const { routes = [] } = JSON.parse(localStorage.getItem(us) ?? "{}");

//   const databases = await indexedDB.databases();
//   routes.forEach((route: string) => {
//     databases.forEach((i: IDBDatabaseInfo) => {
//       if (i.name && i.name.includes(route)) {
//         indexedDB.deleteDatabase(i.name);
//       }
//     });
//   });
// };

// const clearAppStoreToken = () => {
//   const { us } = getPathParams();
//   localStorage.removeItem(us);
//   Object.keys(localStorage).forEach((i) => {
//     if (i.includes(APP_STORE_NAMESPACE)) {
//       const value = omit(JSON.parse(localStorage.getItem(i) ?? ""), us);
//       localStorage.setItem(i, JSON.stringify(value));
//     }
//   });
// };

export const getHomeConfig = async (ps?: string) => {
  if (!ps) {
    ps = getPathParams().ps;
  }
  if (!ps && typeof ps === "undefined") {
    ps = DEVELOPMENT;
  }
  const url = CONFIG_SERVER + ps;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: getTokenStorage(),
    },
  });
  const result = await response.json();
  return result;
};

const { debug } = getPathParams();

export const getPageConfig = async (pageId: any, ps?: string) => {
  if (!ps && typeof ps === "undefined") {
    ps = DEVELOPMENT;
  }
  let url = CONTEXT_URL + "?ps=" + ps + "&pageId=" + pageId;
  if (debug) {
    url += `&debug=${debug}`;
  }
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: getTokenStorage(),
    },
  });
  const result = await response.json();
  return result;
};

//获取编辑页绑变量数据
export const getBindList = async () => {
  // if (!ps && typeof ps === "undefined") {
  //   ps = DEVELOPMENT;
  // }
  // const url = CONTEXT_URL + "?ps=" + ps + "&pageId=" + pageId;
  const url = "/script-enginee/rfa/send?serverCode=step_function";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: getTokenStorage(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ icaCode: "app-edit-generate" }),
  });
  const result = await response.json();
  console.log("1=====result", result);
  return result;
};

export const sendToOnline = async (
  type: string,
  paramsObj: any,
  reason: string,
) => {
  let url: string = "";
  if (type === "application") {
    const { applicationId } = paramsObj;
    const params = {
      applicationId,
      isPublish: true,
      reason,
    };
    const res: any = await ApplicationApi.publishApplication(params);
    return res;
  } else if (type === "package") {
    const { packageId } = paramsObj;
    url = PACKAGE_SEND + "?packageId=" + packageId;
  } else if (type === "dataSource") {
    const { dataSourceId } = paramsObj;
    url = DATASOURCE_SEND + "?datasourceId=" + dataSourceId;
  } else if (type === "com") {
    url = COM_SEND + "packageName=com";
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getTokenStorage(),
    },
    body: JSON.stringify({ reason: reason }),
  });
  const result = await response.json();
  return result;
};

export const deployPageConfig = async (
  pageId: any,
  appCode: any,
  ignoreLayout: boolean,
  acct: string,
) => {
  const url =
    DEPLOY_URL +
    "?pageId=" +
    pageId +
    "&appCode=" +
    appCode.toLowerCase() +
    "&ignoreLayout=" +
    ignoreLayout +
    "&acct=" +
    acct;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: getTokenStorage(),
    },
  });
  const result = await response.json();
  return result?.success;
};

interface SessionConfig {
  mode: string;
  code: string;
  session: string;
}

export const fetchSession = async (data: SessionConfig, isDelete = false) => {
  const sever = isDelete ? REMOVE_SESSION : SESSION_SERVER;
  const response = await fetch(sever, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
      Authorization: getTokenStorage(),
    },
  });
  const result = await response.json();
  return result;
};

export const getHomeTextData = async (ps?: string) => {
  if (!ps) {
    ps = getPathParams().ps;
  }
  if (!ps && typeof ps === "undefined") {
    ps = DEVELOPMENT;
  }
  const url = HOMETEXT_SERVER + ps;
  // return Api.get(url, undefined, {
  //   headers: {
  //     Authorization: getTokenStorage(),
  //   },
  // });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: getTokenStorage(),
    },
  });
  const result = await response.json();

  if (result.data?.config?.logInUrl) {
    setLogInUrl(result.data?.config.logInUrl);
  }

  if (result.statusCode === 401) {
    const logInUrl = getLogInUrl();

    GlobalMessageHelper.open({
      type: "error",
      title: "登录失效",
      message: result.message,
      confirmText: "确定",
      onConfirm: () => {
        if (logInUrl) {
          window.location.href = logInUrl;
        }
      },
    });
  }

  return result;
};
export const getToolbarInfo = async (ps?: string) => {
  if (!ps) {
    ps = getPathParams().ps;
  }
  if (!ps && typeof ps === "undefined") {
    ps = DEVELOPMENT;
  }

  const url = `${LAYOUT_SERVER}?sessionId=${ps}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: getTokenStorage(),
    },
  })
    .then((res) => res.json())
    .then((res) => res);
  return response;
};
export const getMainServerData = async (
  targetServer: TargetServer,
  params: Record<string, any> = {},
  ps?: string,
) => {
  if (!ps) {
    ps = getPathParams().ps;
  }
  if (!ps || typeof ps === "undefined") {
    ps = DEVELOPMENT;
  }
  const url = `${MAIN_SERVER}?ps=${ps}`;
  const param = SERVER_PARAMS(targetServer, params);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getTokenStorage(),
    },
    body: JSON.stringify(param),
  });
  const result = await response.json();
  return result;
};

export const getApplicationsInfo = async (ps?: string) => {
  if (!ps) {
    ps = getPathParams().ps;
  }
  if (!ps && typeof ps === "undefined") {
    ps = DEVELOPMENT;
  }
  const response = fetch(APPLICATION_SERVER + "?sessionId=" + ps, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getTokenStorage(),
    },
  })
    .then((res) => res.json())
    .then((res) => res)
    .catch((error) => error);
  return response;
};

// 获取密码强度
export function getPasswordStrength(ent: string) {
  const response = fetch("/system/password/option?ent=" + ent, {
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Authorization: getTokenStorage(),
    },
  })
    .then((res) => res.json())
    .then((res) => res)
    .catch((error) => error);
  return response;
}
// 获取签入签出状态
export const getEditLockStatus = async (params: any) => {
  const { acct, code } = params;
  const response = await fetch(
    "/script-engine/editLock/state?acct=" + acct + "&code=" + code,
    {
      method: "get",
      headers: {
        "Content-Type": "application/json",
        Authorization: getTokenStorage(),
      },
    },
  )
    .then((res) => res.json())
    .then((res) => res)
    .catch((error) => error);
  return response.data;
};

//更改签入签出状态
export const changeEditLockStatus = async (params: any) => {
  const { acct, code, type } = params;
  const data = {
    code,
    acct,
  };
  const response = await fetch("/script-engine/editLock/" + type, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getTokenStorage(),
    },
    body: JSON.stringify(data), // Convert the data object to a JSON string and set it as the request body
  })
    .then((res) => res.json())
    .then((res) => res)
    .catch((error) => error);
  return response.data;
};

export interface HomePageConfig {
  account: string;
  avatar: string;
  session: string;
  ent: string;
  entName: string;
  site: string;
  siteName: string;
  lang: string;
  langName: string;
  theme: string;
  themeName: string;
  langList: {
    code: string;
    name: string;
  }[];
  siteList: {
    code: string;
    name: string;
  }[];
  themeList: {
    code: string;
    name: string;
  }[];
  userCode: string;
}

export interface HomePageText {
  userPanelText: {
    title: string;
    avatar: string;
    uploadImage: string;
    uploadImageSuccess: string;
    modifyPassword: string;
    oldPassword: string;
    newPassword: string;
    language: string;
    theme: string;
    submit: string;
    newPasswordValid: string;
    confirmPasswordValid: string;
    confirmNewPassword: string;
    medium: string;
    strong: string;
    weak: string;
    passwordLength: string;
    passwordStrengthW: string;
    newPasswordNeedDifference: string;
    passwordDifference: string;
    [key: string]: string;
  };
  dropText: {
    edit: string;
    singOut: string;
  };
  logoutPanel: {
    confirmHeader: string;
    confirm: string;
    cancel: string;
    [key: string]: any;
  };
  topText: {
    logo: string;
    project: string;
    search: string;
    closeCurrentTab: string;
    closeOtherTabs: string;
    closeAllTabs: string;
    openInNewWindow: string;
    setAsHomepage: string;
    setAsFavorite?: string;
    logoPath?: string;
  };
  wsText: {
    title: string;
    failedMsg: string;
    confirm: string;
    cancel: string;
  };
  account: string;
  site: string;
  config: Record<string, any>;
  [key: string]: any;
}

export const initNavMenuData = (
  data: Array<Record<string, any>>,
  code = "MENU",
) => {
  if (data && data.length > 0) {
    const parent: Array<Record<string, any>> = [];
    const item: Array<Record<string, any>> = [];
    data.forEach((i) => {
      if (i.parentCode === code) {
        parent.push(i);
      } else {
        item.push(i);
      }
    });
    parent.forEach((i) => {
      i.children = initNavMenuData(item, i.code);
    });
    return parent;
  }
  return null;
};

// export const removeCacheStore = async (i: any) => {
//   const rxbdInstance = globalStore.get("globalRxDBInstance");
//   const keys = {
//     key1: i.us,
//     key2: i.st,
//     key3: i.ps,
//   };
//   const res = await rxbdInstance.removeData("cacheStore", keys);
//   return res;
// };

export const removeCacheByWebsocket = (
  validUs: Array<string>,
  validPs: Array<string>,
) => {
  removeStorageCache(validUs, validPs);
  // removeRxdbCache(validUs, validPs);
};

// const removeRxdbCache = async (
//   validUs: Array<string>,
//   validPs: Array<string>,
// ) => {
//   const databases = await indexedDB.databases();
//   databases.forEach((i: any) => {
//     i.name &&
//       i.name.includes("_pouch_") &&
//       // i.name.includes("rxdb-dexie") &&
//       !i.name.includes(RXDBERRINFONAME) &&
//       !validPs.some((ps) => i.name && i.name.includes(ps)) &&
//       !validUs.some((us) => i.name && i.name.includes(us)) &&
//       indexedDB.deleteDatabase(i.name);
//   });
// };

const removeStorageCache = (validUs: Array<string>, validPs: Array<string>) => {
  Object.keys(
    omit(localStorage, [...validUs, "USER-ENV", "LOGINCONFIG"]),
  ).forEach((key) => {
    key.includes(APP_STORE_NAMESPACE) && localStorage.getItem(key) !== "{}"
      ? localStorage.setItem(
          key,
          JSON.stringify(
            pick(JSON.parse(localStorage.getItem(key) ?? "{}"), [
              ...validUs,
              ...validPs,
              ...validUs.map((i) => `g_${i}`),
            ]),
          ),
        )
      : localStorage.removeItem(key);
  });
};

const openNewPageThisWindow = async (params: any, response: any) => {
  const state = rootStore.getState();
  const pageList = getPageList(state);
  const target = pageList.find((page: any) => page.code === params.code);
  if (target) {
    rootStore.dispatch({
      type: ReduxActionTypes.CHANGE_VIEW_PAGE,
      payload: { pageKey: createPageKey(target.code) },
    });
    return;
  }

  if (pageList.length >= NAV_MAX_LENGTH) {
    toast.show(`最多展示${NAV_MAX_LENGTH}个页面`, { kind: "warning" });
    return;
  }

  const applicationData = getApplicationData(state);
  const pageInfo = findItemByTravelTree(
    applicationData,
    (page: any) => page.code === params.code,
  );
  if (!pageInfo) return;

  const title = (pageInfo.name?.replace(params.code, "") || "").trim();
  // const response = await fetchSession(params);
  const { ps, us, st, route, openType, lang, param } = response.data;
  const match = matchViewerPath(route);

  if (match) {
    rootStore.dispatch({
      type: ReduxActionTypes.OPEN_NEW_VIEW_PAGE,
      payload: {
        ps,
        pageKey: createPageKey(params.code),
        code: params.code,
        pageId: match.params.pageId,
        title: title,
      },
    });
  }
};

export const openNewPage = async (params: any, newWin?: boolean, extraQuery?: any, noOpen?: boolean) => {
  try {
    const response = await fetchSession(params);

    if (response.statusCode === 500) {
      GlobalMessageHelper.open({
        type: "error",
        title: response.message?.title || "错误",
        message: response.message,
        confirmText: localData.getData("localEnum.SYS-261.confirm") || "确定",
        onConfirm: () => {},
      });
      return;
    }

    if (response.statusCode === 401) {
      const logInUrl = getLogInUrl();

      GlobalMessageHelper.open({
        type: "error",
        title: localData.getData("localEnum.SYS-261.title") || "登录失效",
        message: response.message,
        confirmText: localData.getData("localEnum.SYS-261.confirm") || "确定",
        onConfirm: () => {
          if (logInUrl) {
            window.location.href = logInUrl;
          }
        },
      });
      return;
    }

    const { ps, us, st, route, openType, lang, param } = response.data;
    if (params.mode === "APPLICATION" && !newWin && openType === "3") {
      return await openNewPageThisWindow(params, response);
    }

    const targetPathParams = new URLSearchParams(
      // Object.assign({}, pathParams, { ps, st, us, lang }),
      { ps, st, us, lang, ...extraQuery },
    ).toString();
    const targetRuter = param
      ? `${route}?${targetPathParams}${param}`
      : `${route}?${targetPathParams}`;
    if (openType === "1" || newWin) {
      if (noOpen) {
        return [targetRuter, ps];
      }

      window.open(targetRuter, "_blank");
      return ps;
      // window.open(targetRuter, "_blank", "toolbar=0,location=0,menubar=0");
    } else if (openType === "2") {
      location.replace(targetRuter);
    } else if (openType === "3") {
      //弹窗打开路径
      // useDispatch()(
      //   executeTrigger({
      //     triggerPropertyName: "onClick",
      //     dynamicString: `navigateTo('${
      //       location.origin + targetRuter + "&mode=modal"
      //     }', {}, 'NEW_MODAL')`,
      //     event: {
      //       type: EventType.ON_CLICK,
      //     },
      //   }),
      // );
    }
  } catch (error) {
    console.error(error);
  }
};
