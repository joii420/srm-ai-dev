type ListenerEvent = (key: string, value: any, context?: string) => void;

class GlobalStore {
  private store: Record<string, any> = {};
  private listeners: ListenerEvent[] = [];
  private waitPromiseMap = new Map<
    string,
    {
      resolve: any;
      promise: any;
    }
  >();

  // 用与modal中组件初始化等待
  waitWidgetInit = (widgetId: string, context?: string) => {
    const key = `${context}_${widgetId}`;
    if (this.waitPromiseMap.has(key)) {
      return this.waitPromiseMap.get(key)!.promise;
    }
    let data: any = {};
    const p = new Promise((resolve) => {
      data.resolve = resolve;
    });
    data.promise = p;
    this.waitPromiseMap.set(key, data);
    return p;
  };

  // 结束modal中组件初始化等待
  completeWidgetInit = (widgetId: string, context?: string) => {
    const key = `${context}_${widgetId}`;
    const p = this.waitPromiseMap.get(key);
    if (p) {
      p.resolve(this.get(widgetId, context));
      this.waitPromiseMap.delete(key);
    }
  };

  set(key: string, value: any, context?: string) {
    let store = this.store;
    if (context) {
      if (!this.store[context]) this.store[context] = {};
      store = this.store[context];
    }
    store[key] = value;
    this.completeWidgetInit(key, context);
    // notifyListeners
    this.listeners.forEach((callback) => callback(key, value, context));
  }

  get(key: string, context?: string) {
    if (context) {
      return this.store[context]?.[key];
    }

    return this.store[key];
  }

  subscribe(callback: ListenerEvent) {
    this.listeners.push(callback);
  }

  unsubscribe(callback: ListenerEvent) {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }
}

/** 全局存储 */
const globalStore = new GlobalStore();

if (process.env.NODE_ENV === "development") {
  // @ts-ignore
  window.globalStore = globalStore;
}

export default globalStore;
