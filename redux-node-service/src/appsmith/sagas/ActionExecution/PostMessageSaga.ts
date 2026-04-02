import { call, spawn } from "redux-saga/effects";
import {
  logActionExecutionError,
  TriggerFailureError,
} from "sagas/ActionExecution/errorUtils";
import { isEmpty } from "lodash";
import type { TPostWindowMessageDescription } from "workers/Evaluation/fns/postWindowMessage";

export function* postMessageSaga(action: TPostWindowMessageDescription) {
  const { payload } = action;
  yield spawn(executePostMessage, payload);
}

export function* executePostMessage(
  payload: TPostWindowMessageDescription["payload"],
) {
  const { message, source, targetOrigin } = payload;
  try {
    if (isEmpty(targetOrigin)) {
      throw new TriggerFailureError("Please enter a target origin URL.");
    } else {
      // Node.js: DOM/iframe postMessage not available, log instead
      console.debug("[postMessage]", { source, targetOrigin, message });
    }
  } catch (error) {
    yield call(logActionExecutionError, (error as Error).message, true);
  }
}
