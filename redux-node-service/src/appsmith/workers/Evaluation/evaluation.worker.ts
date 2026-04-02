// Workers do not have access to log.error
/* eslint-disable no-console */
import type { EvalWorkerASyncRequest, EvalWorkerSyncRequest } from "./types";
import {
  syncHandlerMap,
  asyncHandlerMap,
  transmissionErrorHandlerMap,
} from "./handlers";
import type { TMessage } from "utils/MessageUtil";
import { MessageType } from "utils/MessageUtil";
import { WorkerMessenger } from "./fns/utils/Messenger";
// 预加载 linkedom：import SetupDOM 时模块顶层会立即触发 dynamic import，
// 这样在 SETUP 消息到达前 linkedom 就已经开始加载了。
import "./SetupDOM";

//TODO: Create a more complete RPC setup in the subtree-eval branch.
function syncRequestMessageListener(
  e: MessageEvent<TMessage<EvalWorkerSyncRequest>>,
) {
  const { messageType } = e.data;
  if (messageType !== MessageType.REQUEST) return;
  const startTime = Date.now();
  const { body, messageId } = e.data;
  const { method } = body;
  if (!method) return;
  const messageHandler = syncHandlerMap[method];
  if (typeof messageHandler !== "function") return;

  try {
    const responseData = messageHandler(body);
    const transmissionErrorHandler = transmissionErrorHandlerMap[method];
    const endTime = Date.now();

    WorkerMessenger.respond(
      messageId,
      responseData,
      startTime,
      endTime,
      transmissionErrorHandler,
    );
  } catch (err: any) {
    console.error(`[worker-sync] ${method} error:`, err?.message || err);
    const endTime = Date.now();
    WorkerMessenger.respond(messageId, { errors: [{ message: err?.message }] }, startTime, endTime);
  }
}

async function asyncRequestMessageListener(
  e: MessageEvent<TMessage<EvalWorkerASyncRequest>>,
) {
  const { messageType } = e.data;
  if (messageType !== MessageType.REQUEST) return;
  const start = Date.now();
  const { body, messageId } = e.data;
  const { method } = body;
  if (!method) return;
  const messageHandler = asyncHandlerMap[method];
  if (typeof messageHandler !== "function") return;
  try {
    const data = await messageHandler(body);
    const end = Date.now();
    const transmissionErrorHandler = transmissionErrorHandlerMap[method];
    WorkerMessenger.respond(
      messageId,
      data,
      start,
      end,
      transmissionErrorHandler,
    );
  } catch (err: any) {
    console.error(`[worker-async] ${method} error:`, err?.message || err);
    const end = Date.now();
    WorkerMessenger.respond(messageId, { errors: [{ message: err?.message }] }, start, end);
  }
}

self.addEventListener("message", syncRequestMessageListener);
self.addEventListener("message", asyncRequestMessageListener);

self.addEventListener("error", (e) => {
  e.preventDefault();
  console.error(e.message);
});

self.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  // We might want to send this error to the main thread in the future.
  // console error will log the error to the logs tab against trigger field.
  console.error(e.reason.message);
});
