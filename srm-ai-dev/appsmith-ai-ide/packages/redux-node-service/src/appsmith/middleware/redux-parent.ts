export function createLogRedux() {
  return function logRedux(next: any) {
    return function () {
      const store = next.apply(undefined, arguments);

      function dispatch(action: any) {
        const showLog = window.__show_redux_action_log || true;
        if (showLog) {
          const list = [`[REDUX]`, action.type];
          if (showLog === 'all') {
            list.push(action);
          }
          console.log(...list);
        }
        store.dispatch(action);
      }

      return Object.assign({}, store, {
        dispatch,
      })
    }
  }
}
