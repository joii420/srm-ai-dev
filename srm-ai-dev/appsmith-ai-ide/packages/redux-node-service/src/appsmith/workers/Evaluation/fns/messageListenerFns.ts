import { uniqueId } from "lodash";
import ExecutionMetaData from "./utils/ExecutionMetaData";
import { promisify } from "./utils/Promisify";
import TriggerEmitter, { BatchKey } from "./utils/TriggerEmitter";

export let windowMessageListener: ((e: MessageEvent<any>) => void) | null =
  null;

function messageListenerFnDescriptor(
  this: any,
  domain: string,
  handlerCallback: ((...args: any) => any) | string,
) {
  return {
    type: "WINDOW_MESSAGE_LISTENER" as const,
    payload: {
      domain,
      listenerId: this.listenerId,
    },
  };
}

export type TListenMessageArgs = Parameters<typeof messageListenerFnDescriptor>;
export type TListenMessageDescription = ReturnType<
  typeof messageListenerFnDescriptor
>;
export type TListenMessageActionType = TListenMessageDescription["type"];

export function listenMessage(...args: TListenMessageArgs) {
  const metaData = ExecutionMetaData.getExecutionMetaData();
  const [domain, handlerCallback] = args;
  const listenerId = uniqueId("windowMessageListener_");
  // Node.js: emit the trigger to main thread but skip self.addEventListener
  // (worker_threads does not support Web Worker message event pattern)
  TriggerEmitter.emit(BatchKey.process_batched_triggers, {
    trigger: messageListenerFnDescriptor.apply({ listenerId }, [
      domain,
      handlerCallback.toString(),
    ]),
    ...metaData,
  });
  // In Node.js, window message listening is not supported — return immediately
  windowMessageListener = null;
}

function unlistenMessageFnDescriptor(this: any, domain: string) {
  return {
    type: "UNLISTEN_WINDOW_MESSAGE" as const,
    payload: {
      domain,
    },
  };
}

export type TUnlistenMessageArgs = Parameters<
  typeof unlistenMessageFnDescriptor
>;
export type TUnlistenMessageDescription = ReturnType<
  typeof unlistenMessageFnDescriptor
>;
export type TUnlistenMessageActionType = TUnlistenMessageDescription["type"];

export async function unlistenMessage(...args: TUnlistenMessageArgs) {
  const executor = promisify(unlistenMessageFnDescriptor);
  const [domain] = args;
  let response;
  try {
    response = await executor(domain);
    windowMessageListener = null;
  } catch (e) {
    throw e;
  }
  return response;
}
