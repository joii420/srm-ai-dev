type Listener = (...args: any[]) => void;

class CustomEventListener {
  eventMap: Record<string, Listener[]> = {};
  constructor() {}

  addListener(eventName: string, listener: Listener) {
    if (!this.eventMap[eventName]) {
      this.eventMap[eventName] = [];
    }

    this.eventMap[eventName].push(listener);
  }

  removeListener(eventName: string, listener: Listener) {
    if (this.eventMap[eventName]) {
      this.eventMap[eventName] = this.eventMap[eventName].filter(
        (fn) => fn !== listener,
      );
    }
  }

  removeAllListeners() {
    this.eventMap = {};
  }

  fireEvent(eventName: string, args?: any) {
    if (this.eventMap[eventName]) {
      this.eventMap[eventName].forEach((fn) => {
        fn(...args);
      });
    }
  }

  clear() {
    this.eventMap = {};
  }
}

export default CustomEventListener;
