import { apply, select, put, call } from "redux-saga/effects";
import { getParentModalWidget, getWidgetByName } from "sagas/selectors";
// import { operateWidgetAction } from "actions/metaActions";
import AppsmithConsole from "utils/AppsmithConsole";
import {
  ActionValidationError,
  TriggerFailureError,
} from "sagas/ActionExecution/errorUtils";
import { getType, Types } from "utils/TypeHelpers";
import type { FlattenedWidgetProps } from "WidgetProvider/constants";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { getDataTree } from "selectors/dataTreeSelectors";
import type { DataTree, DataTreeEntity } from "entities/DataTree/dataTreeTypes";
import { isWidget } from "@appsmith/workers/Evaluation/evaluationUtils";
import type { TOperateWidgetDescription } from "workers/Evaluation/fns/operateWidget";
import globalStore from "utils/GlobalStore";
import _ from "lodash";
import {
  getDialogStack,
  getTempCanvasWidgets,
} from "selectors/onboardingSelectors";
import { getCanvasWidgets } from "@appsmith/selectors/entitiesSelector";
import { updateAndSaveLayout } from "actions/pageActions";
import { sendSocketErrorMessage } from "pages/AppViewer/AppViewSocket/AppViewSocket";
import { getPagePs } from "selectors/pageSelectors";
import { AttachmentDialogWidgetNames } from "pages/AppViewer/Dialogs/constant/attachment.constant";
import { SelectorDialogTreeGridNames } from "pages/AppViewer/Dialogs/constant/selector.constant";

const GLOBAL_INSTANCE_NAMES: any = {
  globalDialogAgGrid: true,
  globalDialogTreeGrid: true,
  ProgramInstance: true,
  OffLineInstance: true,
  globalMessageTreeGrid: true,
  globalMultiLangTreeGrid: true,
  globalNotificationModalParams: true,
  globalOpenwindowParams: true,
  printDialogTreeGrid: true,
  globalFeatureTreeGrind: true,
  STORE_ALL_TEMP: true,
  RESTORE_ALL_TEMP: true,
  GLOBAL_LOADING_STATE: true,
  flowProcessInterface: true,
  globalMessageNumParams: true,
  globalTodoNumParams: true,
  globalUnReadNumParams: true,
  globalMessageTreeData: true,
  type01: true,
  type01_desc: true,
  type02_desc: true,
  type34: true,
  type34_desc: true,
  type35: true,
  type35_desc: true,
  globalMessageCountParams: true,
};

//common dialog widgetName list
const commonDialogWidgetList = [
  ...AttachmentDialogWidgetNames,
  ...SelectorDialogTreeGridNames,
];

export default function* operateWidgetActionSaga(
  action: TOperateWidgetDescription,
) {
  const { payload } = action;
  const { widgetName, method, params, messageId } = payload;
  if (getType(widgetName) !== Types.STRING) {
    throw new ActionValidationError(
      "OPERATE_WIDGET_BY_NAME",
      "widgetName",
      Types.STRING,
      getType(widgetName),
    );
  }

  const stack: any[] = yield select(getDialogStack);
  // call global instance functions
  const isCommonWidget =
    commonDialogWidgetList.includes(widgetName) && stack.length;
  // update widget in common dialog
  if (isCommonWidget && method === "setValue") {
    if (_.isArray(params) && params.length > 0) {
      yield put({
        type: ReduxActionTypes.UPDATE_COMMON_DIALOG,
        payload: {
          widgetName,
          update: params[0],
        },
      });
    }
    return;
  }

  // 如果需要脚本调用前端非程序组件的方法回调, 可以考虑使用 useFuncWidget 这个hook,
  // 修改处
  if (GLOBAL_INSTANCE_NAMES[widgetName] || isCommonWidget) {
    // 应用全局 loading
    if (
      widgetName === "GLOBAL_LOADING_STATE" &&
      _.isArray(params) &&
      params.length > 0
    ) {
      yield put({
        type: !!params[0]
          ? ReduxActionTypes.START_GLOBAL_LOADING
          : ReduxActionTypes.END_GLOBAL_LOADING,
      });
      return;
    }

    // 暂存整个页面状态，用于绑定变量后恢复状态
    if (widgetName === "STORE_ALL_TEMP") {
      const canvasWidgets = yield select(getCanvasWidgets);
      yield put({
        type: ReduxActionTypes.STORE_CANVAS_LAYOUT_TEMP,
        payload: canvasWidgets,
      });
      return;
    }

    // 恢复整个页面状态
    if (widgetName === "RESTORE_ALL_TEMP") {
      const tempWidgets = yield select(getTempCanvasWidgets);
      yield put(updateAndSaveLayout(tempWidgets));
      return;
    }

    //触发messageModal的props更新
    if (
      widgetName === "globalNotificationModalParams" &&
      method === "setValue"
    ) {
      if (_.isArray(params) && params.length > 0) {
        yield put({
          type: ReduxActionTypes.UPDATE_NOTIFICATION_PROPS,
          payload: params[0],
        });
      }
      return;
    }

    //处理流程接口返回成功后的逻辑
    if (widgetName === "flowProcessInterface" && method === "setValue") {
      window.close();
      return;
    }
    //获取刷新后消息或者待办的数据
    if (widgetName === "globalMessageTreeData" && method === "setValue") {
      if (_.isArray(params) && params.length > 0) {
        yield put({
          type: ReduxActionTypes.UPDATE_MESSAGE_TREE_DATA,
          payload: params[0],
        });
      }
      return;
    }
    // 处理消息数量接口返回后的逻辑-通用
    if (widgetName === "globalMessageCountParams" && method === "setValue") {
      if (_.isArray(params) && params.length > 0) {
        yield put({
          type: ReduxActionTypes.UPDATE_MESSAGE_COUNT,
          payload: params,
        });
      }
      return;
    }
    //处理消息数量接口返回后的逻辑
    if (widgetName === "globalMessageNumParams" && method === "setValue") {
      if (_.isArray(params) && params.length > 0) {
        yield put({
          type: ReduxActionTypes.UPDATE_MESSAGE_NUM,
          payload: params[0],
        });
      }
      return;
    }

    //处理待办数量接口返回后的逻辑
    if (widgetName === "globalTodoNumParams" && method === "setValue") {
      if (_.isArray(params) && params.length > 0) {
        yield put({
          type: ReduxActionTypes.UPDATE_TODO_NUM,
          payload: params[0],
        });
      }
      return;
    }
    //处理未读消息数量接口返回后的逻辑
    if (widgetName === "globalUnReadNumParams" && method === "setValue") {
      if (_.isArray(params) && params.length > 0) {
        yield put({
          type: ReduxActionTypes.UPDATE_UNREAD_NUM,
          payload: params[0],
        });
      }
      return;
    }

    //触发messageModal的props更新
    if (widgetName === "globalOpenwindowParams" && method === "setValue") {
      if (_.isArray(params) && params.length > 0) {
        yield put({
          type: ReduxActionTypes.UPDATE_OPENWINDOW_PROPS,
          payload: params[0],
        });
      }
      return;
    }

    // 脚本修改弹窗树表props，默认修改的是最顶层的弹窗树表
    if (
      (widgetName === "globalDialogTreeGrid" ||
        widgetName === "globalMessageTreeGrid" ||
        widgetName === "printDialogTreeGrid" ||
        widgetName === "globalFeatureTreeGrind") &&
      method === "setValue"
    ) {
      if (_.isArray(params) && params.length > 0) {
        yield put({
          type: ReduxActionTypes.UPDATE_QUERY_PROPS,
          payload: params[0],
        });
      }
      return;
    }
    if (widgetName === "globalDialogAgGrid" && method === "setValue") {
      if (_.isArray(params) && params.length > 0) {
        yield put({
          type: ReduxActionTypes.UPDATE_QUERY_PROPS,
          payload: params[0],
        });
      }
      return;
    }
    // !!!!兼容之前写法，脚本统一写法后删除这里
    if (widgetName === "globalMultiLangTreeGrid" && method === "setValue") {
      if (_.isArray(params) && params.length > 0) {
        yield put({
          type: ReduxActionTypes.UPDATE_QUERY_PROPS,
          payload: params[0],
        });
      }
      return;
    }

    // if (widgetName === "globalMessageTreeGrid" && method === "setValue") {
    //   if (_.isArray(params) && params.length > 0) {
    //     yield put({
    //       type: ReduxActionTypes.UPDATE_QUERY_PROPS,
    //       payload: params[0],
    //     });
    //   }
    //   return;
    // }

    let realWidgetName = widgetName;
    if (widgetName === "globalDialogAgGrid") {
      realWidgetName = `globalDialogAgGrid_${stack.length - 1}`;
    }
    // 脚本调用弹窗树表方法，默认调用的是最顶层的弹窗树表方法，找到最顶层的树表名称
    if (widgetName === "globalDialogTreeGrid") {
      realWidgetName = `globalDialogTreeGrid_${stack.length - 1}`;
    }
    // !!!!兼容之前写法，脚本统一写法后删除这里
    if (widgetName === "globalMultiLangTreeGrid") {
      realWidgetName = `globalDialogTreeGrid_${stack.length - 1}`;
    }
    // 脚本调用消息树表方法，默认调用的是最顶层的消息树表方法，找到最顶层的树表名称
    if (widgetName === "globalMessageTreeGrid") {
      realWidgetName = `globalMessageTreeGrid_${stack.length - 1}`;
    }
    if (widgetName === "printDialogTreeGrid") {
      realWidgetName = `printDialogTreeGrid_${stack.length - 1}`;
    } else if (/^type\d{2}(?:_desc)?$/.test(widgetName)) {
      realWidgetName = widgetName;
    }
    const ps: string = yield select(getPagePs);
    const instanceRef = globalStore.get(realWidgetName, ps);
    if (!instanceRef) {
      yield call(
        sendSocketErrorMessage,
        messageId,
        `OperateWidget执行出错，找不到实例：${realWidgetName}`,
      );
      throw new TriggerFailureError(
        `OperateWidget执行出错，找不到实例：${realWidgetName}`,
      );
    }
    if (instanceRef.actionDispatcher) {
      const result: unknown = yield apply(
        instanceRef,
        instanceRef.actionDispatcher,
        [method, params as any],
      );
      return result;
    }

    const fn = instanceRef[method];
    if (typeof fn === "function") {
      const result: unknown = yield apply(instanceRef, fn, params as any);
      return result;
    } else {
      yield call(
        sendSocketErrorMessage,
        messageId,
        `OperateWidget执行出错，找不到函数：${realWidgetName}.${method}(${params})`,
      );
      throw new TriggerFailureError(
        `OperateWidget执行出错，找不到函数：${realWidgetName}.${method}(${params})`,
      );
    }
  }

  const dataTree: DataTree = yield select(getDataTree);
  // const configTree: ConfigTree = yield select(getConfigTree);
  const widget: FlattenedWidgetProps | undefined = yield select(
    getWidgetByName,
    widgetName,
  );
  const ps: string = yield select(getPagePs);

  if (!widget) {
    const widgetRef = globalStore.get(widgetName, ps);

    if (widgetRef?.onWidgetReady) {
      yield apply(widgetRef, widgetRef.onWidgetReady, []);
    }

    if (widgetRef && widgetRef.actionDispatcher) {
      const result: unknown = yield apply(
        widgetRef,
        widgetRef.actionDispatcher,
        [method, params as any, messageId],
      );
      return result;
    }

    console.log("action=====", payload);
    yield call(
      sendSocketErrorMessage,
      messageId,
      `Widget ${widgetName} not found`,
    );
    throw new TriggerFailureError(`Widget ${widgetName} not found`);
  }
  const evaluatedEntity = dataTree[widget.widgetName];
  // const evaluatedEntityConfig = configTree[widget.widgetName];
  if (evaluatedEntity) {
    const widgetId = evaluatedEntity.widgetId;
    let widgetRef = globalStore.get(widgetId, ps);
    if (!widgetRef) {
      // 如果组件是modal中的组件，则需要等待modal中的组件渲染完成再调用方法
      const parentModalData: any = yield select(getParentModalWidget, widgetId);
      if (parentModalData && parentModalData.isVisible) {
        widgetRef = yield call(globalStore.waitWidgetInit, widgetId, ps);
      }
      if (!widgetRef) {
        console.error(
          `can not get ${parentModalData ? `[${parentModalData.widgetName}]` : ""} '${widget.widgetName}' in ps of '${ps}' when run method '${method}'`,
        );
        return;
      }
    }

    if (widgetRef.onWidgetReady) {
      yield apply(widgetRef, widgetRef.onWidgetReady, []);
    }

    if (widgetRef.actionDispatcher) {
      const result: unknown = yield apply(
        widgetRef,
        widgetRef.actionDispatcher,
        [method, params as any],
      );
      return result;
    }
    const fn = widgetRef[method];
    if (typeof fn === "function") {
      const result: unknown = yield apply(widgetRef, fn, params as any);
      if (result instanceof Error) {
        yield call(sendSocketErrorMessage, messageId, result.message);
        throw result;
      } else {
        return result;
      }
    } else {
      yield call(
        sendSocketErrorMessage,
        messageId,
        `OperateWidget执行出错，找不到函数：${widgetRef.props.widgetName}.${method}(${params})`,
      );
      throw new TriggerFailureError(
        `OperateWidget执行出错，找不到函数：${widgetRef.props.widgetName}.${method}(${params})`,
      );
    }
  }

  // yield take(ReduxActionTypes.OPERATE_WIDGET_EVALUATED);

  AppsmithConsole.info({
    text: `operateWidget('${widgetName}', ${method}, ${params}) was triggered`,
  });
}
