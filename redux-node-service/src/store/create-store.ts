import '../adapters/globals';
import { createStore, applyMiddleware, compose } from 'redux';
// @ts-ignore - reduxBatch type mismatch but works at runtime
import { reduxBatch } from '@manaflair/redux-batch';
import createSagaMiddleware from 'redux-saga';

// @ts-ignore - appReducer has type errors in ambient modules but works at runtime
import appReducer from '@appsmith/reducers';

export function createNodeStore() {
  const sagaMiddleware = createSagaMiddleware();
  const store = createStore(
    appReducer,
    compose(
      reduxBatch,
      applyMiddleware(sagaMiddleware),
      reduxBatch,
    ),
  );
  return { store, sagaMiddleware };
}
