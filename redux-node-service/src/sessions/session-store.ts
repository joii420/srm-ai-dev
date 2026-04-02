/**
 * Per-session Store + Saga + ActionWaiter creation.
 */
import { createStore, applyMiddleware, compose } from "redux";
// @ts-ignore
import { reduxBatch } from "@manaflair/redux-batch";
import createSagaMiddleware from "redux-saga";
import type { Task } from "redux-saga";
import type { NodeEvalService } from "../adapters/worker-adapter";
import { createActionWaiter, type ActionWaiter } from "../utils/action-waiter";
import { createLogRedux } from "middleware/redux-parent";

// @ts-ignore
import appReducer from "@appsmith/reducers";

// Mutex to serialize session creation and prevent evalWorker injection race
let _createLock: Promise<void> = Promise.resolve();

export function createSessionStore(evalWorker: NodeEvalService) {
  const sagaMiddleware = createSagaMiddleware();
  const actionWaiter = createActionWaiter();

  const store = createStore(
    appReducer,
    compose(
      reduxBatch,
      applyMiddleware(actionWaiter.middleware, sagaMiddleware),
      reduxBatch,
      createLogRedux(),
    ),
  );

  // Inject the per-session evalWorker, then immediately start sagas
  const { setEvalWorker } = require("../appsmith/sagas/EvaluationsSaga");
  setEvalWorker(evalWorker);

  const { rootSaga } = require("../store/saga-runner");
  const sagaTask: Task = sagaMiddleware.run(rootSaga);

  return { store, sagaMiddleware, sagaTask, actionWaiter };
}

/**
 * Concurrency-safe wrapper around createSessionStore.
 */
export async function createSessionStoreSafe(evalWorker: NodeEvalService) {
  const prevLock = _createLock;
  let resolve: () => void;
  _createLock = new Promise<void>((r) => { resolve = r; });
  await prevLock;

  try {
    return createSessionStore(evalWorker);
  } finally {
    resolve!();
  }
}
