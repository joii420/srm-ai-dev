/**
 * Action Waiter — 在 Express 路由中等待特定 Redux Action 被 dispatch。
 *
 * 原理：注入一个 Redux middleware 监听所有 dispatch 的 action，
 * waitForAction() 返回 Promise，匹配到目标 action 时 resolve。
 *
 * 用法：
 *   const { middleware, waitForAction, raceForAction } = createActionWaiter();
 *   // middleware 注入到 createStore 的 applyMiddleware 中
 *   // 路由中：
 *   store.dispatch({ type: "TRIGGER" });
 *   const result = await waitForAction("SUCCESS", { timeout: 10000 });
 */

export interface WaitForActionOptions {
  /** 超时毫秒，默认 30000 */
  timeout?: number;
  /** 额外过滤条件，返回 true 时才匹配 */
  filter?: (action: any) => boolean;
}

export interface RaceEntry {
  /** 要等待的 action type */
  actionType: string;
  /** 额外过滤条件 */
  filter?: (action: any) => boolean;
}

export interface RaceResult {
  /** 匹配到的 action type */
  type: string;
  /** 匹配到的完整 action 对象 */
  payload: any;
}

export interface ActionWaiter {
  /** Redux middleware，必须注入到 store */
  middleware: any;
  /** 等待指定 action type 被 dispatch，返回匹配的 action */
  waitForAction: (actionType: string, options?: WaitForActionOptions) => Promise<any>;
  /** 竞速等待多个 action type，任一匹配即 resolve */
  raceForAction: (entries: RaceEntry[], options?: { timeout?: number }) => Promise<RaceResult>;
  /** 清理所有等待中的 listener（session 销毁时调用） */
  destroy: () => void;
}

export function createActionWaiter(): ActionWaiter {
  const listeners = new Set<(action: any) => void>();
  let destroyed = false;

  // Redux middleware: 拦截所有 action，通知等待者
  const middleware = (_store: any) => (next: any) => (action: any) => {
    const result = next(action); // 先让 reducer + saga 处理
    for (const listener of listeners) {
      try {
        listener(action);
      } catch {
        // listener 可能已被清理
      }
    }
    return result;
  };

  function waitForAction(
    actionType: string,
    options: WaitForActionOptions = {},
  ): Promise<any> {
    const { timeout = 30000, filter } = options;

    if (destroyed) {
      return Promise.reject(new Error("ActionWaiter has been destroyed"));
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`waitForAction("${actionType}") timed out after ${timeout}ms`));
      }, timeout);

      const handler = (action: any) => {
        if (action.type === actionType) {
          if (filter && !filter(action)) return;
          cleanup();
          resolve(action);
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        listeners.delete(handler);
      };

      listeners.add(handler);
    });
  }

  /**
   * 竞速等待多个 action type，任一匹配即 resolve。
   *
   * 用法：
   *   const { type, action } = await raceForAction([
   *     { actionType: "SUCCESS" },
   *     { actionType: "FAILURE" },
   *   ], { timeout: 15000 });
   *
   *   if (type === "SUCCESS") { ... } else { ... }
   */
  function raceForAction(
    entries: RaceEntry[],
    options: { timeout?: number } = {},
  ): Promise<RaceResult> {
    const { timeout = 30000 } = options;

    if (destroyed) {
      return Promise.reject(new Error("ActionWaiter has been destroyed"));
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        const types = entries.map((e) => e.actionType).join(", ");
        reject(new Error(`raceForAction([${types}]) timed out after ${timeout}ms`));
      }, timeout);

      const handler = (action: any) => {
        for (const entry of entries) {
          if (action.type === entry.actionType) {
            if (entry.filter && !entry.filter(action)) continue;
            cleanup();
            resolve({ type: action.type, payload: action.payload });
            return;
          }
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        listeners.delete(handler);
      };

      listeners.add(handler);
    });
  }

  function destroy() {
    destroyed = true;
    listeners.clear();
  }

  return { middleware, waitForAction, raceForAction, destroy };
}
