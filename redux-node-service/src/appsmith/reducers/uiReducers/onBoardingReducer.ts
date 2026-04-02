import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { initDataSource } from "ce/utils/globalFn";
import type { HomePageConfig, HomePageText } from "ce/utils/tool";
import { initNavMenuData } from "ce/utils/tool";
import { omit, pick } from "lodash";
import type { SIGNPOSTING_STEP } from "pages/Editor/FirstTimeUserOnboarding/Utils";
import { createReducer } from "utils/ReducerUtils";
import { traverseTreeData } from "utils/treeUtils";
import type { commonDialogType } from "workers/Evaluation/fns/showCommonDialog";
import { COMMONDIALOG } from "workers/Evaluation/fns/showCommonDialog";

const LEFT_MENU_COLLAPSE_KEY = '_left_menu_collapse'

type workId = "todo" | "completed" | "readedMessage" | "unReadMessage";
type WorkInfoType = Record<workId, any>;

export const QUERY_DIALOG_DEFAULT_PROPS = {
  allowEditing: true,
  allowAdding: true,
  allowDeleting: true,
  allowEditOnDblClick: true,
  allowNextRowEdit: true,
  allowSelection: false,
  showConfirmDialog: true,
  isQueryMode: false,
  showDeleteConfirmDialog: true,
  selectedRow: {},
  editMode: "Row",
  allowExcelExport: true,
  allowPaging: true,
  height: "auto",
  // text: "Label",
  totalRecordsCount: 0, //总记录数
  pageSettings: {
    pageSize: 10, //每页条数
    currentPage: 1, //当前页
  },
  dataSource: [],
  fieldSource: [],
  pageSizeOptions: [
    { text: "5", value: 5 },
    { text: "10", value: 10 },
    { text: "20", value: 20 },
    { text: "50", value: 50 },
    { text: "100", value: 100 },
    { text: "500", value: 500 },
  ],
  // serverSidePage: false,
};
export const MESSAGE_DIALOG_DEFAULT_PROPS = {
  allowEditing: false,
  allowAdding: true,
  allowDeleting: true,
  allowEditOnDblClick: true,
  allowNextRowEdit: true,
  allowSelection: true,
  showConfirmDialog: true,
  showDeleteConfirmDialog: true,
  editMode: "Row",
  allowExcelExport: true,
  allowPaging: true,
  height: "auto",
  // text: "多错误弹窗",
  totalRecordsCount: 0, //总记录数
  selectedRowIndex: 0,
  pageSettings: {
    pageSize: 10, //每页条数
    currentPage: 1, //当前页
  },
  pageSizeOptions: [
    { text: "5", value: 5 },
    { text: "10", value: 10 },
    { text: "20", value: 20 },
    { text: "50", value: 50 },
    { text: "100", value: 100 },
    { text: "500", value: 500 },
  ],
};

export const PRINT_DIALOG_DEFAULT_PROPS = {
  allowEditing: false,
  allowAdding: true,
  allowDeleting: true,
  allowEditOnDblClick: true,
  allowNextRowEdit: true,
  allowSelection: true,
  showConfirmDialog: true,
  showDeleteConfirmDialog: true,
  editMode: "Row",
  allowExcelExport: true,
  allowPaging: true,
  height: "auto",
  totalRecordsCount: 0, //总记录数
  selectedRowIndex: 0,
  pageSettings: {
    pageSize: 10, //每页条数
    currentPage: 1, //当前页
  },
  pageSizeOptions: [
    { text: "5", value: 5 },
    { text: "10", value: 10 },
    { text: "20", value: 20 },
    { text: "50", value: 50 },
    { text: "100", value: 100 },
    { text: "500", value: 500 },
  ],
};
export const MATERIALS_DIALOG_DEFAULT_PROPS = {
  allowEditing: true,
  allowAdding: true,
  allowDeleting: true,
  allowEditOnDblClick: true,
  allowNextRowEdit: true,
  allowSelection: false,
  showConfirmDialog: true,
  isQueryMode: false,
  showDeleteConfirmDialog: true,
  selectedRow: {},
  editMode: "Row",
  allowExcelExport: true,
  allowPaging: true,
  height: "auto",
  text: "Label",
  totalRecordsCount: 0, //总记录数
  pageSettings: {
    pageSize: 10, //每页条数
    currentPage: 1, //当前页
  },
  dataSource: [],
  fieldSource: [],
  pageSizeOptions: [
    { text: "5", value: 5 },
    { text: "10", value: 10 },
    { text: "20", value: 20 },
    { text: "50", value: 50 },
    { text: "100", value: 100 },
    { text: "500", value: 500 },
  ],
};

const initialState: OnboardingState = {
  // Signposting
  inOnboardingWidgetSelection: false,
  forceOpenWidgetPanel: false,
  firstTimeUserOnboardingApplicationIds: [],
  firstTimeUserOnboardingComplete: false,
  showFirstTimeUserOnboardingModal: false,
  setOverlay: false,
  stepState: [],
  showSignpostingTooltip: false,
  showAnonymousDataPopup: false,
  showNavigateModal: false,
  navigateModalPath: "",
  toolbarConfig: {},
  leftSidebarConfig: {
    rowIndex: 0,
    data: [],
    length: 0,
    selectedRow: {},
    nextRowData: {},
    selectedIndex: -1,
    lang: "zh_CN",
    disableClick: false,
  },
  pathData: [],
  currentPath: "",
  prevPath: "",
  currentAnchor: "",
  homepageTextConfig: {
    userPanelText: {
      title: "",
      avatar: "",
      uploadImage: "",
      uploadImageSuccess: "",
      modifyPassword: "",
      oldPassword: "",
      newPassword: "",
      language: "",
      theme: "",
      submit: "",
      newPasswordValid: "",
      confirmPasswordValid: "",
      confirmNewPassword: "",
      medium: "",
      strong: "",
      weak: "",
      passwordLength: "",
      passwordStrengthW: "",
      newPasswordNeedDifference: "",
      passwordDifference: "",
    },
    dropText: {
      edit: "",
      singOut: "",
    },
    logoutPanel: {
      confirmHeader: "",
      confirm: "",
      cancel: "",
    },
    topText: {
      logo: "",
      project: "",
      search: "",
    },
    wsText: {
      title: "",
      failedMsg: "",
      confirm: "",
      cancel: "",
    },
    account: "",
    site: "",
    config: {},
  },
  homepageUseInfo: {
    account: "",
    avatar: "",
    session: "",
    ent: "",
    entName: "",
    site: "",
    siteName: "",
    lang: "",
    langName: "",
    theme: "",
    themeName: "",
    langList: [],
    siteList: [],
    themeList: [],
    userCode: "",
  },
  layoutData: {},
  applicationData: [],

  // showMessageModal: false,
  // messageModalProps: MESSAGE_DIALOG_DEFAULT_PROPS,
  // messageModalParams: {},
  currentPageInfo: {
    isShowCount: false,
    isDashboard: true,
    showAnchorMenu: false,
    showItemList: false,
    code: "",
  },
  dashboard: true,
  showAnchorMenu: false,
  showItemList: false,
  toolbar: [],
  anchorMenu: [],
  moreMenu: [],
  socketConfig: {
    status: "pending",
    data: {
      title: "",
      failedMsg: "",
      confirm: "",
      cancel: "",
    },
  },
  isSocketConnected: "pending",
  errorPageInfo: {},
  socket: {},
  relatedData: [],

  globalLoadingState: "close",
  // 弹窗栈
  dialogStack: [],
  //更新待办和未读消息总数量
  messageNum: 0,
  //更新待办数量
  todoNum: 0,
  //更新未读数量
  unReadNum: 0,
  //消息代办的数据
  messageTreeData: "",
  freshMessageTime: 5,
  messageInfoCache: {},
  updates: undefined,
  evalMode: false,
  connectionsData: [],
  isInitEnd: { isEnd: false, fn: [] },
  pageContext: {},
  messageCountInfo: {},
  docListState: {
    dataSource: [],
    fieldSource: [],
    disabled: false,
  },
  forceShowModal: false,
  isLeftMenuCollapse: localStorage.getItem(LEFT_MENU_COLLAPSE_KEY) === "1",
  isSearchModalVisible: false,
  favoritesMenus: [],
  favoritesFolders: [],
};

export interface StepState {
  step: SIGNPOSTING_STEP;
  completed: boolean;
  read?: boolean;
}

export interface OnboardingState {
  inOnboardingWidgetSelection: boolean;
  forceOpenWidgetPanel: boolean;
  firstTimeUserOnboardingApplicationIds: string[];
  firstTimeUserOnboardingComplete: boolean;
  showFirstTimeUserOnboardingModal: boolean;
  stepState: StepState[];
  setOverlay: boolean;
  showSignpostingTooltip: boolean;
  showAnonymousDataPopup: boolean;
  showNavigateModal: boolean;
  navigateModalPath: string;
  toolbarConfig: any;
  leftSidebarConfig: {
    rowIndex: number;
    data: any[];
    length: number;
    lang: string;
    fieldSource?: any[];
    [key: string]: any;
  };
  pathData: {
    [key: string]: any;
  }[];
  currentPath: string;
  prevPath: string;
  currentAnchor: string;
  homepageTextConfig: HomePageText;
  homepageUseInfo: HomePageConfig;
  layoutData: any;
  applicationData: any[];

  // showMessageModal: boolean;
  // messageModalProps: unknown;
  // messageModalParams: unknown;

  currentPageInfo: {
    isDashboard: boolean;
    showAnchorMenu: boolean;
    showItemList: boolean;
    isShowCount: boolean;
    [key: string]: any;
  };
  dashboard: boolean;
  showAnchorMenu: boolean;
  showItemList: boolean;

  globalLoadingState: "show" | "close";
  globalProgressBar: any;
  globalPredefinedDialog: any;
  dialogStack: any[];
  messageNum: number;
  todoNum: number;
  unReadNum: number;
  messageTreeData: string;
  toolbar: any[];
  moreMenu: any[];
  anchorMenu: any[];
  socketConfig: {
    status: "pending" | "resolved" | "rejected";
    data: {
      title: string;
      failedMsg: string;
      confirm: string;
      cancel: string;
    };
  };
  isSocketConnected: "pending" | "resolved" | "rejected";
  errorPageInfo: Record<string, any>;
  socket: any;
  relatedData: any;
  leftBarTitleList?: any[];
  updates: any;
  evalMode: boolean;
  connectionsData: any[];
  isInitEnd: { [key: string]: any };
  pageContext: object;
  freshMessageTime: number;
  messageInfoCache: Partial<WorkInfoType>;
  messageCountInfo: { [id: string]: number };
  docListState: Record<string, any>;
  forceShowModal: boolean;
  isLeftMenuCollapse: boolean;
  isSearchModalVisible: boolean;
  favoritesMenus: any[];
  favoritesFolders: any[];
}

const onboardingReducer = createReducer(initialState, {
  [ReduxActionTypes.UPDATE_FAVORITE_MENU]: (
    state: OnboardingState,
    action: ReduxAction<{ favoritesMenus: any[] }>,
  ) => {
    const favoritesMenus = action.payload.favoritesMenus
    const favoritesFolders: any[] = [];
    traverseTreeData(favoritesMenus, (node) => {
      if (node.type === '0') {
        favoritesFolders.push(node.name);
      }
    });

    return {
      ...state,
      favoritesMenus,
      favoritesFolders,
    };
  },
  [ReduxActionTypes.UPDATE_LEFT_MENU_COLLAPSE]: (
    state: OnboardingState,
    action: ReduxAction<{ isLeftMenuCollapse: boolean }>,
  ) => {
    const isLeftMenuCollapse = action.payload.isLeftMenuCollapse
    localStorage.setItem(LEFT_MENU_COLLAPSE_KEY, isLeftMenuCollapse ? "1" : "0")

    return {
      ...state,
      isLeftMenuCollapse,
    };
  },
  [ReduxActionTypes.UPDATE_SEARCH_MODAL_VISIBLE]: (
    state: OnboardingState,
    action: ReduxAction<{ isSearchModalVisible: boolean }>,
  ) => {
    return {
      ...state,
      isSearchModalVisible: action.payload.isSearchModalVisible,
    };
  },
  [ReduxActionTypes.FORCE_SHOW_MODAL]: (
    state: OnboardingState,
    action: ReduxAction<{ forceShowModal: boolean }>,
  ) => {
    return {
      ...state,
      forceShowModal: action.payload.forceShowModal,
    };
  },
  [ReduxActionTypes.TOGGLE_ONBOARDING_WIDGET_SELECTION]: (
    state: OnboardingState,
    action: ReduxAction<boolean>,
  ) => {
    return {
      ...state,
      inOnboardingWidgetSelection: action.payload,
    };
  },
  [ReduxActionTypes.SET_FIRST_TIME_USER_ONBOARDING_APPLICATION_IDS]: (
    state: OnboardingState,
    action: ReduxAction<string[]>,
  ) => {
    return {
      ...state,
      firstTimeUserOnboardingApplicationIds: action.payload,
    };
  },
  [ReduxActionTypes.SET_FIRST_TIME_USER_ONBOARDING_COMPLETE]: (
    state: OnboardingState,
    action: ReduxAction<boolean>,
  ) => {
    return {
      ...state,
      firstTimeUserOnboardingComplete: action.payload,
    };
  },
  [ReduxActionTypes.SET_SHOW_FIRST_TIME_USER_ONBOARDING_MODAL]: (
    state: OnboardingState,
    action: ReduxAction<boolean>,
  ) => {
    return {
      ...state,
      showFirstTimeUserOnboardingModal: action.payload,
    };
  },
  [ReduxActionTypes.SET_FORCE_WIDGET_PANEL_OPEN]: (
    state: OnboardingState,
    action: ReduxAction<boolean>,
  ) => {
    return { ...state, forceOpenWidgetPanel: action.payload };
  },
  [ReduxActionTypes.SIGNPOSTING_STEP_UPDATE]: (
    state: OnboardingState,
    action: ReduxAction<StepState>,
  ) => {
    const index = state.stepState.findIndex(
      (stepState) => stepState.step === action.payload.step,
    );
    const newArray = [...state.stepState];
    if (index >= 0) {
      newArray[index] = action.payload;
    } else {
      newArray.push(action.payload);
    }
    return {
      ...state,
      stepState: newArray,
    };
  },
  [ReduxActionTypes.SIGNPOSTING_MARK_ALL_READ]: (state: OnboardingState) => {
    return {
      ...state,
      stepState: state.stepState.map((step) => {
        if (step.completed) {
          return {
            ...step,
            read: true,
          };
        }
        return step;
      }),
    };
  },
  [ReduxActionTypes.SET_SIGNPOSTING_OVERLAY]: (
    state: OnboardingState,
    action: ReduxAction<boolean>,
  ) => {
    return {
      ...state,
      setOverlay: action.payload,
    };
  },
  [ReduxActionTypes.SIGNPOSTING_SHOW_TOOLTIP]: (
    state: OnboardingState,
    action: ReduxAction<boolean>,
  ) => {
    return {
      ...state,
      showSignpostingTooltip: action.payload,
    };
  },
  [ReduxActionTypes.SHOW_ANONYMOUS_DATA_POPUP]: (
    state: OnboardingState,
    action: ReduxAction<boolean>,
  ) => {
    return {
      ...state,
      showAnonymousDataPopup: action.payload,
    };
  },
  [ReduxActionTypes.SHOW_NAVIGATE_MODAL]: (
    state: OnboardingState,
    action: ReduxAction<string>,
  ) => {
    return {
      ...state,
      showNavigateModal: true,
      navigateModalPath: action.payload,
    };
  },
  [ReduxActionTypes.CLOSE_NAVIGATE_MODAL]: (state: OnboardingState) => {
    return { ...state, showNavigateModal: false, navigateModalPath: "" };
  },
  [ReduxActionTypes.UPDATE_TOOLBAR_CONFIG]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    return {
      ...state,
      toolbarConfig: { ...state.toolbarConfig, ...action.payload },
    };
  },
  [ReduxActionTypes.NAVIGATE_ERROR_PAGE]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    let info = state.errorPageInfo;
    if (!info.statusCode) {
      info = action.payload;
    }
    return { ...state, errorPageInfo: info };
  },
  [ReduxActionTypes.UPDATE_LEFTSIDEBAR_CONFIG]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    const {
      data,
      fieldSource,
      actionName,
      pageSize,
      selectedRow,
      selectedIndex,
      length,
      rowIndex,
      nextRowData,
      parentId,
      id,
      deleteAction,
      viewData,
      chooserData,
    } = action.payload;

    let dataSource = state.leftSidebarConfig.data;
    let fields = fieldSource
      ? fieldSource?.map((f: any) => ({
          ...f,
          isVisible: f?.isVisible ?? true,
        }))
      : state.leftSidebarConfig.fieldSource;
    let displaySelectedIndex =
      selectedIndex ?? state.leftSidebarConfig.selectedIndex ?? -1;
    let displayLength = length ?? state.leftSidebarConfig.length;
    let currentRow = selectedRow ?? state.leftSidebarConfig.selectedRow;
    let originalRowIndex = state.leftSidebarConfig.rowIndex;
    const nextRowForDelete = nextRowData ?? state.leftSidebarConfig.nextRowData;
    const keys: Array<string> = fields?.map((i: any) => i.field);
    let _deleteAction = {};
    let _viewData = viewData ?? state.leftSidebarConfig?.viewData;
    // console.log(">>>>>>>>>action", action.payload);

    if (chooserData) {
      fields = fields?.map((f: any) => {
        if (typeof chooserData[f.field] === "boolean") {
          return {
            ...f,
            isVisible: chooserData[f.field],
          };
        }
        return f;
      });
    }

    // 重置数据源
    if (data) {
      if (actionName === "delete") {
        _deleteAction = {
          action: "delete",
          data: data,
        };

        //没有左侧数表时删除
        if (!state.currentPageInfo.showItemList) {
          const keys = Object.keys(data);
          const deleteIndex = dataSource?.findIndex((d) =>
            keys.every((k) => data[k] === d[k]),
          );
          if (deleteIndex >= 0) {
            const newData = dataSource.toSpliced(deleteIndex, 1);
            displaySelectedIndex =
              deleteIndex === dataSource.length - 1
                ? newData.length - 1
                : deleteIndex;
            displayLength = newData.length;
            dataSource = newData;
            _viewData = newData;
          }
        }
      } else {
        //没有左侧取发过来的数据
        // if (!state.currentPageInfo.showItemList) {
        _viewData = data;
        // }
        dataSource = initDataSource(fields, data);
        displayLength = data.length;
        displaySelectedIndex = -1;
        if (data.length === 0) {
          originalRowIndex = -1;
          currentRow = {};
        } else if (typeof rowIndex !== "undefined") {
          originalRowIndex = rowIndex;
          displaySelectedIndex = rowIndex;
          currentRow = dataSource[rowIndex];
        }
      }
    }

    // 更新选中行
    if (selectedRow) {
      originalRowIndex = dataSource.findIndex((item: any) =>
        keys.every((k) => item[k] === selectedRow[k]),
      );
    }

    // 设置 disabled
    let disabled = state.leftSidebarConfig.disableClick;
    if (actionName) {
      if (["insert", "query", "edit", "copy"].includes(actionName)) {
        disabled = true;
      } else if (["commit", "cancel"].includes(actionName)) {
        disabled = false;
      }
      if (["insert", "update"].includes(actionName)) {
      }
    }

    const updateRow =
      displaySelectedIndex >= 0 ? _viewData[displaySelectedIndex] : {};
    // console.log(">>>>>>>>>>>>action", action.payload, dataSource);
    return {
      ...state,
      leftSidebarConfig: {
        data: dataSource,
        fieldSource: fields,
        selectedIndex: displaySelectedIndex,
        length: displayLength,
        selectedRow: currentRow,
        rowIndex: originalRowIndex,
        disableClick: disabled,
        pageSize: pageSize ?? state.leftSidebarConfig.pageSize,
        parentId,
        id,
        nextRowData: nextRowForDelete,
        deleteAction: _deleteAction,
        viewData: _viewData,
        updateRow,
        excuteQuery: actionName === "query",
      },
    };
  },
  [ReduxActionTypes.UPDATE_PATHDATA]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    return {
      ...state,
      pathData: action.payload.pathData ?? state.pathData,
      currentPath: action.payload.currentPath ?? state.currentPath,
      prevPath: action.payload.prevPath ?? state.prevPath,
      currentAnchor: action.payload.currentAnchor ?? state.currentAnchor,
      homepageUseInfo: action.payload.homepageUseInfo ?? state.homepageUseInfo,
    };
  },
  [ReduxActionTypes.UPDATE_HOMEPAGETEXT_CONFIG]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    return { ...state, homepageTextConfig: action.payload };
  },
  [ReduxActionTypes.UPDATE_LAYOUTDATA]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    return { ...state, layoutData: action.payload };
  },
  [ReduxActionTypes.UPDATE_TOOLBAR]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    return { ...state, toolbar: action.payload };
  },
  [ReduxActionTypes.ANCHOR_MENU]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    return { ...state, anchorMenu: action.payload };
  },
  [ReduxActionTypes.MORE_MENU]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    return { ...state, moreMenu: action.payload };
  },
  [ReduxActionTypes.PAGE_CONFIG_INFO]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    const {
      envData,
      configData,
      anchorData,
      leftTitleData,
      menuData,
      relatedData,
      toolbarData,
      topMenuData,
    } = action.payload;

    const { data, statusCode, lang } = envData;
    let info = state.errorPageInfo;
    if (!info.statusCode) {
      info = {
        statusCode,
        language: lang,
      };
    }

    let current, navData;
    if (topMenuData.data) {
      navData = initNavMenuData(topMenuData.data.menus);
      current = topMenuData.data.current;
    }

    return {
      ...state,
      homepageTextConfig: data,
      errorPageInfo: info,
      homepageUseInfo: configData.data ?? state.homepageUseInfo,
      toolbar: toolbarData.data,
      moreMenu: menuData.data,
      anchorMenu: anchorData.data,
      applicationData: navData,
      currentPageInfo: current ?? state.currentPageInfo,
      leftBarTitleList: leftTitleData.data ?? state.leftBarTitleList,
      relatedData: relatedData.data,
    };
  },
  [ReduxActionTypes.UPDATE_APPLICATIONDATA]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    const { current, menus } = action.payload;
    const data = initNavMenuData(menus);
    return {
      ...state,
      applicationData: data,
      currentPageInfo: current ?? state.currentPageInfo,
      // dashboard: current.isDashboard ?? state.dashboard,
      // showAnchorMenu: current.showAnchorMenu ?? state.showAnchorMenu,
      // showItemList: current.showItemList ?? state.showItemList,
    };
  },
  [ReduxActionTypes.SOCKET_CONFIG]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    let dialogStack = state.dialogStack;
    if (action.payload?.status === "rejected") {
      dialogStack = [];
    }
    return {
      ...state,
      socketConfig: { ...state.socketConfig, ...action.payload },
      dialogStack,
    };
  },
  [ReduxActionTypes.SOCKET_CONNECTED]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    const data: any = {
      isSocketConnected: action.payload,
    };
    if (action.payload === "rejected") {
      data["dialogStack"] = [];
      data["messageInfoCache"] = {};
    }
    return { ...state, ...data };
  },
  [ReduxActionTypes.SOCKET_OBJECT]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    return { ...state, socket: action.payload };
  },
  [ReduxActionTypes.SET_LOADING]: (
    state: OnboardingState,
    action: ReduxAction<{ params: unknown }>,
  ) => {
    return {
      ...state,
      globalLoadingState: action.payload.params,
    };
  },
  // 修改处
  [ReduxActionTypes.SHOW_PROGRESS_BAR]: (
    state: OnboardingState,
    action: ReduxAction<{ params: unknown }>,
  ) => {
    return {
      ...state,
      globalProgressBar: action.payload,
    };
  },
  [ReduxActionTypes.SHOW_PREDEFINED_DIALOG]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    console.log("PredefinedDialog-xxxx====", action.payload);
    const value =
      typeof action.payload === "string"
        ? null
        : {
            ...state.globalPredefinedDialog,
            ...action.payload,
          };
    return {
      ...state,
      globalPredefinedDialog: value,
    };
  },
  [ReduxActionTypes.SET_UPDATES]: (
    state: OnboardingState,
    action: ReduxAction<unknown>,
  ) => {
    return { ...state, updates: action.payload };
  },
  [ReduxActionTypes.SET_PAGE_CONTEXT]: (
    state: OnboardingState,
    action: ReduxAction<unknown>,
  ) => {
    return { ...state, pageContext: action.payload };
  },

  // 修改:evalMode属性更新2
  [ReduxActionTypes.UPDATE_PAGE_EVAL_MODE]: (
    state: OnboardingState,
    action: ReduxAction<{ evalMode: boolean }>,
  ) => {
    return { ...state, evalMode: action.payload.evalMode };
  },
  [ReduxActionTypes.UPDATE_CONNECTIONS_DATA]: (
    state: OnboardingState,
    action: ReduxAction<{ connectionsData: any[] }>,
  ) => {
    return { ...state, connectionsData: action.payload.connectionsData };
  },
  [ReduxActionTypes.UPDATE_IS_INIT_END]: (
    state: OnboardingState,
    action: ReduxAction<{ isInitEnd: object }>,
  ) => {
    return {
      ...state,
      isInitEnd: { ...state.isInitEnd, ...action.payload.isInitEnd },
    };
  },
  // 树表弹窗
  [ReduxActionTypes.SHOW_QUERY]: (
    state: OnboardingState,
    action: ReduxAction<{ params: unknown }>,
  ) => {
    const fieldSource =
      action.payload?.params?.params?.openParams?.fieldData || [];
    const newDialog = {
      queryModalParams: action.payload.params,
      agGridProps: {
        dataSource: [],
        fieldSource,
        showHeader: action.payload?.params?.params?.dialogType === "openWindow",
        ...(action.payload?.params?.params?.openParams || {}),
      },
      type: "QUERY",
    };
    return {
      ...state,
      dialogStack: [...state.dialogStack, newDialog],
    };
  },
  [ReduxActionTypes.CLOSE_QUERY]: (
    state: OnboardingState,
    action: ReduxAction<{ clearCache?: boolean }>,
  ) => {
    if (action.payload?.clearCache) {
      return {
        ...state,
        dialogStack: [...state.dialogStack.slice(0, -1)],
        messageInfoCache: {},
      };
    }

    return {
      ...state,
      dialogStack: [...state.dialogStack.slice(0, -1)],
    };
  },
  [ReduxActionTypes.SHOW_COMMON_DIALOG]: (
    state: OnboardingState,
    action: ReduxAction<{
      params: any;
      type: commonDialogType;
      messageId: string;
    }>,
  ) => {
    const _dialogStack = state.dialogStack.slice() || [];
    const { type, params, messageId } = action.payload;
    if (type && COMMONDIALOG[type]) {
      const newDialog = {
        modalParams: {
          messageId,
          ...(params || {}),
          dialogType: type,
        },
        type: COMMONDIALOG[type],
      };
      _dialogStack.push(newDialog);
    }
    return {
      ...state,
      dialogStack: _dialogStack,
    };
  },
  [ReduxActionTypes.UPDATE_COMMON_DIALOG]: (
    state: OnboardingState,
    action: ReduxAction<{ widgetName: string; update: any }>,
  ) => {
    if (!state.dialogStack.length) {
      return { ...state };
    }
    const { widgetName, update } = action.payload;
    const lastDialog = state.dialogStack.pop();
    lastDialog.modalParams[widgetName] = Object.assign(
      {},
      lastDialog.modalParams[widgetName],
      update,
    );
    return {
      ...state,
      dialogStack: [...state.dialogStack, lastDialog],
    };
  },
  [ReduxActionTypes.UPDATE_QUERY_PROPS]: (
    state: OnboardingState,
    action: ReduxAction<unknown>,
  ) => {
    if (!state.dialogStack.length) {
      return { ...state };
    }
    const lastDialog = state.dialogStack.pop();
    return {
      ...state,
      dialogStack: [
        ...state.dialogStack,
        {
          ...lastDialog,
          treeGridProps: {
            ...(lastDialog.treeGridProps || {}),
            ...(action.payload || {}),
          },
          agGridProps: {
            ...(lastDialog.agGridProps || {}),
            ...(action.payload || {}),
          },
        },
      ],
    };
  },
  //更新messageModal的数据
  [ReduxActionTypes.UPDATE_NOTIFICATION_PROPS]: (
    state: OnboardingState,
    action: ReduxAction<unknown>,
  ) => {
    if (!state.dialogStack.length) {
      return { ...state };
    }
    const lastDialog = state.dialogStack.pop();
    let freshMessageTime = state.freshMessageTime;
    const data = JSON.parse((action.payload as any)?.params ?? "");
    if (data.refush_time) {
      freshMessageTime = parseInt(data.refush_time);
    }
    return {
      ...state,
      dialogStack: [
        ...state.dialogStack,
        {
          ...lastDialog,
          queryModalParams: {
            ...(lastDialog.queryModalParams || {}),
            ...(action.payload || {}),
          },
        },
      ],
      freshMessageTime,
      messageInfoCache: {
        ...state.messageInfoCache,
        [data.state]: data,
      },
    };
  },
  // 更新openwindow选中之后的数据
  [ReduxActionTypes.UPDATE_OPENWINDOW_PROPS]: (
    state: OnboardingState,
    action: ReduxAction<unknown>,
  ) => {
    if (!state.dialogStack.length) {
      return { ...state };
    }
    const openWindowDialog = state.dialogStack[0];
    const newDialogStack = state.dialogStack.map((item) => {
      if (item.type === openWindowDialog.type) {
        if (action.payload?.type === "updateDataSource") {
          const data = { ...item };
          if (typeof action.payload?.params === "string") {
            const _data = JSON.parse(action.payload?.params);
            data.treeGridProps.dataSource = _data;
          }
          return {
            ...data,
            updateDataSource: {
              ...(openWindowDialog.updateDataSource || {}),
              ...(action.payload || {}),
            },
          };
        } else if (action.payload?.type === "updateDisableBtn") {
          return {
            ...item,
            updateDisableBtn: {
              ...(openWindowDialog.updateDisableBtn || {}),
              ...(action.payload || {}),
            },
          };
        } else {
          return {
            ...item,
            openWindowValue: {
              ...(openWindowDialog.openWindowValue || {}),
              ...(action.payload || {}),
            },
          };
        }
      } else {
        return item;
      }
    });
    return {
      ...state,
      dialogStack: newDialogStack,
    };
  },
  //更新消息待办树表的数据
  [ReduxActionTypes.UPDATE_MESSAGE_TREE_DATA]: (
    state: OnboardingState,
    action: ReduxAction<unknown>,
  ) => {
    return {
      ...state,
      messageTreeData: action?.payload?.params || "",
    };
  },
  //更新消息数量的数据
  [ReduxActionTypes.UPDATE_MESSAGE_NUM]: (
    state: OnboardingState,
    action: ReduxAction<unknown>,
  ) => {
    return {
      ...state,
      messageNum: action?.payload?.params || 0,
    };
  },
  // 更新各类型消息数量
  [ReduxActionTypes.UPDATE_MESSAGE_COUNT]: (
    state: OnboardingState,
    action: ReduxAction<any[]>,
  ) => {
    const messageCountInfo = {
      ...state.messageCountInfo,
    };
    const params = action?.payload || [];
    params.forEach((item) => {
      if (item.id) {
        messageCountInfo[item.id] = item.params || 0;
      }
    });

    return {
      ...state,
      messageCountInfo,
    };
  },

  //更新待办数量
  [ReduxActionTypes.UPDATE_TODO_NUM]: (
    state: OnboardingState,
    action: ReduxAction<unknown>,
  ) => {
    return {
      ...state,
      todoNum: action?.payload?.params || 0,
    };
  },
  //更新未读数量
  [ReduxActionTypes.UPDATE_UNREAD_NUM]: (
    state: OnboardingState,
    action: ReduxAction<unknown>,
  ) => {
    return {
      ...state,
      unReadNum: action?.payload?.params || 0,
    };
  },
  // 消息弹窗
  [ReduxActionTypes.SHOW_MESSAGE]: (
    state: OnboardingState,
    action: ReduxAction<{ params: any }>,
  ) => {
    let newDialog;
    let freshMessageTime = state.freshMessageTime;
    let messageInfoCache = state.messageInfoCache;
    //消息通知弹窗
    if (action.payload.params.type === "messageNotification") {
      const data = JSON.parse((action.payload as any)?.params.params ?? "");
      if (data.refush_time) {
        freshMessageTime = parseInt(data.refush_time);
      }
      messageInfoCache = {
        ...state.messageInfoCache,
        [data.state]: data,
      };
      newDialog = {
        queryModalParams: action.payload.params,
        treeGridProps: { ...MESSAGE_DIALOG_DEFAULT_PROPS },
        type: "MESSAGE_NOTIFICATION",
      };
    } else if (action.payload.params.type === "approval") {
      newDialog = {
        queryModalParams: action.payload.params,
        treeGridProps: { ...MESSAGE_DIALOG_DEFAULT_PROPS },
        openWindowValue: "",
        updateDisableBtn: false,
        type: "APPROVAL",
      };
    } else {
      newDialog = {
        queryModalParams: action.payload.params,
        treeGridProps: { ...MESSAGE_DIALOG_DEFAULT_PROPS },
        type: "MESSAGE",
      };
    }
    return {
      ...state,
      dialogStack: [...state.dialogStack, newDialog],
      freshMessageTime,
      messageInfoCache,
    };
  },
  //料件弹窗
  [ReduxActionTypes.SHOW_MATERIALS]: (
    state: OnboardingState,
    action: ReduxAction<{ params: any }>,
  ) => {
    let newDialog = {
      queryModalParams: action.payload.params,
      treeGridProps: {},
      openWindowValue: "",
      updateDataSource: "",
      type: "MATERIALS",
    };
    if (
      action.payload?.params?.params &&
      typeof action.payload?.params?.params === "string"
    ) {
      const data = JSON.parse(action.payload?.params?.params);
      newDialog = {
        ...newDialog,
        treeGridProps: {
          ...newDialog.treeGridProps,
          ...pick(data, ["dataSource", "fieldSource"]),
        },
      };
    }
    return {
      ...state,
      dialogStack: [...state.dialogStack, newDialog],
    };
  },
  //打印弹窗
  [ReduxActionTypes.SHOW_PRINT]: (
    state: OnboardingState,
    action: ReduxAction<{ params: unknown }>,
  ) => {
    const newDialog = {
      queryModalParams: action.payload.params,
      treeGridProps: { ...PRINT_DIALOG_DEFAULT_PROPS },
      type: "PRINT",
    };
    return {
      ...state,
      dialogStack: [...state.dialogStack, newDialog],
    };
  },
  [ReduxActionTypes.CLOSE_PRINT]: (state: OnboardingState) => {
    return { ...state, dialogStack: [...state.dialogStack.slice(0, -1)] };
  },
  //document list
  [ReduxActionTypes.PUT_STATE_FROM_APP_TO_DOC_LIST]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    const {
      data,
      rowIndex,
      fieldSource,
      pageSize,
      parentId,
      id,
      length,
      lang,
    } = action.payload;
    let len = length ?? state.docListState.length;
    if (data) {
      len = data.length;
    }
    return {
      ...state,
      docListState: {
        ...state.docListState,
        dataSource: data ?? state.docListState.dataSource,
        fieldSource: fieldSource ?? state.docListState.fieldSource,
        pageSize: pageSize ?? state.docListState.pageSize,
        parentId: parentId ?? state.docListState.parentId,
        id: id ?? state.docListState.id,
        selectedIndex: rowIndex ?? state.docListState.selectedIndex,
        lang: lang ?? state.docListState.lang,
        length: len,
      },
    };
  },
  [ReduxActionTypes.UPDATE_DOC_LIST_SELECT_INDEX]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    const { selectedIndex, selectedRowData, length, data } = action.payload;
    let len = length ?? state.docListState.length;
    let _selectedRowData = state.docListState.selectedRowData;
    if (selectedRowData) {
      _selectedRowData = selectedRowData;
    } else if (!state.currentPageInfo.showItemList) {
      _selectedRowData = state.docListState.dataSource[selectedIndex];
    }
    return {
      ...state,
      docListState: {
        ...state.docListState,
        dataSource: data ?? state.docListState.dataSource,
        selectedIndex: selectedIndex ?? state.docListState.selectedIndex,
        selectedRowData: _selectedRowData,
        length: len,
      },
    };
  },
  [ReduxActionTypes.EXECUTE_ACTION_TO_DOC_LIST]: (
    state: OnboardingState,
    action: ReduxAction<any>,
  ) => {
    const { data, actionName } = action.payload;
    let disabled = state.docListState.disabled;
    let selectedIndex = state.docListState.selectedIndex;
    let dataSource = state.docListState.dataSource;
    let selectedRowData = state.docListState.selectedRowData;
    if (actionName === "delete") {
      //没有左侧数表时删除
      if (!state.currentPageInfo.showItemList) {
        const keys = Object.keys(data);
        const deleteIndex = dataSource.findIndex((d: any) =>
          keys.every((k) => data[k] === d[k]),
        );
        if (deleteIndex > -1) {
          selectedIndex =
            deleteIndex === state.docListState.dataSource.length - 1
              ? deleteIndex - 1
              : deleteIndex;
          const _dataSource = dataSource.slice();
          dataSource = _dataSource.splice(deleteIndex, 1);
          selectedRowData = dataSource[selectedIndex];
        }
      }
    }
    if (actionName) {
      if (["insert", "query", "edit", "copy"].includes(actionName)) {
        disabled = true;
      } else if (["commit", "cancel"].includes(actionName)) {
        disabled = false;
      }
      if (["insert", "update"].includes(actionName)) {
      }
    }
    return {
      ...state,
      docListState: {
        ...state.docListState,
        dataSource,
        disabled,
        selectedIndex,
        selectedRowData,
        currentActionState: actionName,
      },
    };
  },
});

export default onboardingReducer;
