import { throttle } from "lodash";

type ResizeObserverFun = (entries: ResizeObserverEntry[]) => void;
type ObserverType = 'width' | 'height';

class ResizeObserverHelper {
  elSizeMap = new Map<any, { width: number, height: number }>()
  observeInstance: ResizeObserver | null = null
  types: ObserverType[] = []
  callback: ResizeObserverFun = () => {}

  constructor(observer: ResizeObserverFun, types: ObserverType[]) {
    this.callback = observer;
    this.types = types;
    if (ResizeObserverHelper.isObserverAble()) {
      this.observeInstance = new ResizeObserver(throttle(this.handleObserverChange, 30, { trailing: true }));
    }
  }

  static isObserverAble() {
    return !!window.ResizeObserver;
  }

  private handleObserverChange = (entries: ResizeObserverEntry[]) => {
    const list: ResizeObserverEntry[] = [];
    for (const entry of entries) {
      const size = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
      const oldSize = this.elSizeMap.get(entry.target);
      if (!oldSize || this.types.some(type => size[type] !== oldSize[type])) {
        this.elSizeMap.set(entry.target, size);
        list.push(entry);
      }
    }

    if (list.length) {
      this.callback(list);
    }
  }

  observe(el: Element) {
    if (el && this.observeInstance) {
      this.observeInstance.observe(el);
    }
  }

  clear() {
    if (this.observeInstance) {
      this.observeInstance.disconnect();
    }
    this.elSizeMap.clear();
  }

  destroy() {
    this.clear();
    this.observeInstance = null;
  }
}

export default ResizeObserverHelper
