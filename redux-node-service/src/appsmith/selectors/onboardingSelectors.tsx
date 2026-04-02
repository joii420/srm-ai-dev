import type { AppState } from "@appsmith/reducers";
import { createSelector } from "reselect";
import {
  getCurrentActions,
  getCanvasWidgets,
} from "@appsmith/selectors/entitiesSelector";
import type { SIGNPOSTING_STEP } from "pages/Editor/FirstTimeUserOnboarding/Utils";
import { isBoolean, intersection } from "lodash";
import { getEvaluationInverseDependencyMap } from "./dataTreeSelectors";
import { getNestedValue } from "pages/Editor/utils";
import { getDependenciesFromInverseDependencies } from "components/editorComponents/Debugger/helpers";

// Signposting selectors
// 修改处

export const getShowNavigateModal = (state: AppState) => {
  return state.ui.onBoarding.showNavigateModal;
};
export const getNavigateModalPath = (state: AppState) => {
  return state.ui.onBoarding.navigateModalPath;
};

export const getToolbarConfig = (state: AppState) => {
  return state.ui.onBoarding.toolbarConfig;
};
export const getLeftSidebarConfig = (state: AppState) => {
  return state.ui.onBoarding.leftSidebarConfig;
};
export const getDocListState = (state: AppState) => {
  return state.ui.onBoarding.docListState;
};
export const getPathData = (state: AppState) => {
  return state.ui.onBoarding.pathData;
};
export const getCurrentPath = (state: AppState) => {
  return state.ui.onBoarding.currentPath;
};
export const getPrevPath = (state: AppState) => {
  return state.ui.onBoarding.prevPath;
};
export const getCurrentAnchor = (state: AppState) => {
  return state.ui.onBoarding.currentAnchor;
};

export const getHomepageUseInfo = (state: AppState) => {
  return state.ui.onBoarding.homepageUseInfo;
};
export const getHomepageTextConfig = (state: AppState) => {
  return state.ui.onBoarding.homepageTextConfig;
};
export const isDebugAble = (state: AppState) => {
  return !!state.ui.onBoarding.homepageTextConfig?.config?.debugger;
};
export const getLayoutData = (state: AppState) => {
  return state.ui.onBoarding.layoutData;
};
export const getToolBar = (state: AppState) => {
  return state.ui.onBoarding.toolbar;
};
export const getAnchorMenu = (state: AppState) => {
  return state.ui.onBoarding.anchorMenu;
};
export const getMoreMenu = (state: AppState) => {
  return state.ui.onBoarding.moreMenu;
};
export const getSocketConfig = (state: AppState) => {
  return state.ui.onBoarding.socketConfig;
};
export const getIsSocketConnected = (state: AppState) => {
  return state.ui.onBoarding.isSocketConnected;
};
export const getApplicationData = (state: AppState) => {
  return state.ui.onBoarding.applicationData;
};
export const getFavoritesMenus = (state: AppState) => {
  return state.ui.onBoarding.favoritesMenus;
};
export const getFavoritesFolders = (state: AppState) => {
  return state.ui.onBoarding.favoritesFolders;
};
export const getRelatedData = (state: AppState) => {
  return state.ui.onBoarding.relatedData;
};
export const getLeftSidebarTitle = (state: AppState) => {
  return state.ui.onBoarding.leftBarTitleList;
};
// export const getIsdashboard = (state: AppState) => {
//   return state.ui.onBoarding.dashboard;
// };
// export const getIsShowAnchorMenu = (state: AppState) => {
//   return state.ui.onBoarding.showAnchorMenu;
// };
// export const getIsShowItemList = (state: AppState) => {
//   return state.ui.onBoarding.showItemList;
// };
export const getCurrentPageInfo = (state: AppState) => {
  return state.ui.onBoarding.currentPageInfo;
};
export const getErrorPageInfo = (state: AppState) => {
  return state.ui.onBoarding.errorPageInfo;
};
export const getSocket = (state: AppState) => {
  return state.ui.onBoarding.socket;
};
// 修改处
export const getDialogStack = (state: AppState) => {
  return state.ui.onBoarding.dialogStack;
};
export const getUpdates = (state: AppState) => {
  return state.ui.onBoarding.updates;
};
export const getPageContext = (state: AppState) => {
  return state.ui.onBoarding.pageContext;
};
export const getEvalMode = (state: AppState) => {
  return state.ui.onBoarding.evalMode;
};
export const getConnectionsData = (state: AppState) => {
  return state.ui.onBoarding.connectionsData;
};
export const getIsInitEnd = (state: AppState) => {
  return state.ui.onBoarding.isInitEnd;
};
export const getMessageNumStack = (state: AppState) => {
  return state.ui.onBoarding.messageNum;
};
export const getMessageCountInfo = (state: AppState) => {
  return state.ui.onBoarding.messageCountInfo;
};
export const getTodoNumStack = (state: AppState) => {
  return state.ui.onBoarding.todoNum;
};
export const getMessageTreeData = (state: AppState) => {
  return state.ui.onBoarding.messageTreeData;
};
export const getUnreadNumStack = (state: AppState) => {
  return state.ui.onBoarding.unReadNum;
};
export const getFreshMessageTime = (state: AppState) => {
  return state.ui.onBoarding.freshMessageTime;
};
export const getMessageInfoCache = (state: AppState) => {
  return state.ui.onBoarding.messageInfoCache ?? {};
};
export const getGlobalLoadingState = (state: AppState) => {
  return state.ui.onBoarding.globalLoadingState;
};
export const getGlobalProgressBar = (state: AppState) => {
  return state.ui.onBoarding.globalProgressBar;
};
export const getGlobalPredefinedDialog = (state: AppState) => {
  return state.ui.onBoarding.globalPredefinedDialog;
};
export const getModalTreeGridProps = (level: number) =>
  createSelector(getDialogStack, (stack) => {
    return stack[level]?.treeGridProps;
  });
export const getAttachmentConfig = (level: number) =>
  createSelector(getDialogStack, (stack) => {
    return stack[level]?.attachmentConfig;
  });
export const getTempCanvasWidgets = (state: AppState) => {
  return state.entities.canvasWidgetsTemp;
};

export const getFirstTimeUserOnboardingApplicationIds = (state: AppState) => {
  return state.ui.onBoarding.firstTimeUserOnboardingApplicationIds;
};

export const getFirstTimeUserOnboardingComplete = (state: AppState) => {
  return state.ui.onBoarding.firstTimeUserOnboardingComplete;
};

export const getFirstTimeUserOnboardingModal = (state: AppState) =>
  state.ui.onBoarding.showFirstTimeUserOnboardingModal;

export const getIsFirstTimeUserOnboardingEnabled = createSelector(
  (state: AppState) => state.entities.pageList.applicationId,
  getFirstTimeUserOnboardingApplicationIds,
  (currentApplicationId, applicationIds) => {
    return applicationIds.includes(currentApplicationId);
  },
);

export const getInOnboardingWidgetSelection = (state: AppState) =>
  state.ui.onBoarding.inOnboardingWidgetSelection;

export const getSignpostingStepState = (state: AppState) =>
  state.ui.onBoarding.stepState;
export const getSignpostingStepStateByStep = createSelector(
  getSignpostingStepState,
  (_state: AppState, step: SIGNPOSTING_STEP) => step,
  (stepState, step) => {
    return stepState.find((state) => state.step === step);
  },
);
export const getSignpostingUnreadSteps = createSelector(
  getSignpostingStepState,
  (stepState) => {
    if (!stepState.length) return [];
    return stepState.filter((state) => isBoolean(state.read) && !state.read);
  },
);
export const getSignpostingSetOverlay = (state: AppState) =>
  state.ui.onBoarding.setOverlay;
export const getSignpostingTooltipVisible = (state: AppState) =>
  state.ui.onBoarding.showSignpostingTooltip;
export const getIsAnonymousDataPopupVisible = (state: AppState) =>
  state.ui.onBoarding.showAnonymousDataPopup;
export const isWidgetActionConnectionPresent = createSelector(
  getCanvasWidgets,
  getCurrentActions,
  getEvaluationInverseDependencyMap,
  (widgets, actions, deps) => {
    const actionLables = actions.map((action: any) => action.config.name);

    let isBindingAvailable = !!Object.values(widgets).find((widget: any) => {
      const depsConnections = getDependenciesFromInverseDependencies(
        deps,
        widget.widgetName,
      );
      return !!intersection(depsConnections?.directDependencies, actionLables)
        .length;
    });

    if (!isBindingAvailable) {
      isBindingAvailable = !!Object.values(widgets).find((widget: any) => {
        return (
          widget.dynamicTriggerPathList &&
          !!widget.dynamicTriggerPathList.find((path: { key: string }) => {
            return !!actionLables.find((label: string) => {
              const snippet = getNestedValue(widget, path.key);
              return snippet ? snippet.indexOf(`${label}.run`) > -1 : false;
            });
          })
        );
      });
    }
    return isBindingAvailable;
  },
);

export const getIsAnchorMenuVisible = createSelector(
  getCurrentPageInfo,
  (currentPageInfo) => {
    return !currentPageInfo.isDashboard && currentPageInfo.showAnchorMenu;
  },
);

export const getForceShowModal = (state: AppState) => state.ui.onBoarding.forceShowModal;
export const getIsLeftMenuCollapse = (state: AppState) => state.ui.onBoarding.isLeftMenuCollapse;
export const getIsSearchModalVisible = (state: AppState) => state.ui.onBoarding.isSearchModalVisible;
