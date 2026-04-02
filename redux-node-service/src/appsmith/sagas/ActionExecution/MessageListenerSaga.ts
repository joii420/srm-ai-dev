import type { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import type { TriggerMeta } from "@appsmith/sagas/ActionExecution/ActionExecutionSagas";
import { call, spawn, take } from "redux-saga/effects";
import { logActionExecutionError } from "sagas/ActionExecution/errorUtils";
import type { Channel } from "redux-saga";
import { channel } from "redux-saga";
import { evalWorker } from "sagas/EvaluationsSaga";
import type {
  TListenMessageDescription,
  TUnlistenMessageDescription,
} from "workers/Evaluation/fns/messageListenerFns";

let callbackChannel: Channel<MessageEvent> | null = null;

function* callbackHandler(listenerId?: string, targetOrigin?: string) {
  let payload: MessageEvent;
  if (!callbackChannel) return;
  while ((payload = yield take(callbackChannel))) {
    const { data, origin } = payload;
    if (origin !== targetOrigin) {
      return;
    }
    if (listenerId) yield call(evalWorker.ping, { data }, listenerId);
  }
}

let messageHandler: any;
export function* listenWindowMessage(
  action: TListenMessageDescription,
  _: EventType,
  triggerMeta: TriggerMeta,
) {
  const { payload: actionPayload } = action;
  if (messageHandler) {
    logActionExecutionError(
      "页面已经添加了消息监听器，在添加前请先移除现有的消息监听器",
      true,
      triggerMeta.source,
      triggerMeta.triggerPropertyName,
    );
    return;
  }
  // Node.js: window.addEventListener("message") not available
  // Create channel but don't register browser listener — channel stays empty
  callbackChannel = channel<MessageEvent>();
  yield spawn(callbackHandler, actionPayload.listenerId, actionPayload.domain);
  messageHandler = () => {};
  console.debug("[messageListener] Window message listener not available in Node.js");
}

export function* unlistenWindowMessage(
  action: TUnlistenMessageDescription,
  eventType: EventType,
  triggerMeta: TriggerMeta,
) {
  if (messageHandler === undefined) {
    logActionExecutionError(
      "没有发现消息监听器",
      true,
      triggerMeta.source,
      triggerMeta.triggerPropertyName,
    );
    return;
  }
  // Node.js: no browser event listener to remove
  messageHandler = undefined;
  callbackChannel?.close();
}
