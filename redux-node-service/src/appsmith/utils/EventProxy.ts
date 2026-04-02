type EventHandler = (e: any) => any;

interface EventItem {
  handler: EventHandler;
  priority: number; // 优先级，越小越优先触发
}

class DocumentEventProxy {
  private evtMap = new Map<string, EventItem[]>();
  private captureEvtMap = new Map<string, EventItem[]>();
  private clearFn: (() => void)[] = [];
  private ignoreNextMouseup = false;

  constructor() {}

  init() {
    this.clearFn.push(this.createGlobalEvent("pointerdown", false));
    this.clearFn.push(this.createGlobalEvent("mousedown", false));
    this.clearFn.push(this.createGlobalEvent("mouseup", false));
    this.clearFn.push(this.createGlobalEvent("dblclick", false));
    this.clearFn.push(this.createGlobalEvent("click", false));
    this.clearFn.push(this.createGlobalEvent("keydown", false));

    this.clearFn.push(this.createGlobalEvent("pointerdown", true));
    this.clearFn.push(this.createGlobalEvent("mousedown", true));
    this.clearFn.push(this.createGlobalEvent("mouseup", true));
    this.clearFn.push(this.createGlobalEvent("dblclick", true));
    this.clearFn.push(this.createGlobalEvent("click", true));
    this.clearFn.push(this.createGlobalEvent("keydown", true));
  }

  ignoreNextMouseUpEvent() {
    this.ignoreNextMouseup = true;
  }

  createIgnoreEvent(eventName: string) {
    const e = new Event(eventName);
    e.__ignore = true;
    return e;
  }

  createGlobalEvent(eventName: string, capture: boolean) {
    const handler = (e: any) => {
      if (e.__ignore) return;
      if (this.ignoreNextMouseup && eventName === "mouseup") {
        setTimeout(() => {
          this.ignoreNextMouseup = false;
        }, 100)
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (this.ignoreNextMouseup && eventName === "click") {
        this.ignoreNextMouseup = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const targetMap = capture ? this.captureEvtMap : this.evtMap;
      const list = targetMap.get(eventName);
      if (list) {
        for (const item of list) {
          item.handler(e);
          if (e.cancelBubble) return;
        }
      }
    };
    document.addEventListener(eventName, handler, capture);
    return () => {
      document.removeEventListener(eventName, handler, capture);
    };
  }

  addEventListener(
    eventName: string,
    handler: EventHandler,
    capture?: boolean,
    priority?: number,
  ) {
    priority = priority || 1;
    const targetMap = capture ? this.captureEvtMap : this.evtMap;
    let list = targetMap.get(eventName);
    if (!list) {
      list = [];
      targetMap.set(eventName, list);
    }
    list.push({ handler, priority });
    list.sort((a, b) => a.priority - b.priority);
  }

  removeEventListener(
    eventName: string,
    handler: EventHandler,
    capture?: boolean,
  ) {
    const targetMap = capture ? this.captureEvtMap : this.evtMap;
    let eventList = targetMap.get(eventName);
    if (eventList) {
      eventList = eventList.filter((item) => item.handler !== handler);
      targetMap.set(eventName, eventList);
    }
  }

  removeEventListeners(eventName: string, capture?: string) {
    const targetMap = capture ? this.captureEvtMap : this.evtMap;
    targetMap.set(eventName, []);
  }

  destroy() {
    this.clearFn.forEach((fn) => fn());
    this.evtMap.clear();
    this.captureEvtMap.clear();
    this.clearFn = [];
  }
}

export const GlobalDocumentEventProxy = new DocumentEventProxy();
