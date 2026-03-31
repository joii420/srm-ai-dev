
type EventHandler = (args: any) => void

class _GlobalEvent {
  boundedEvents: { [eventName: string]: EventHandler[] } = {}

  addEventListener(eventName: string, handler: EventHandler) {
    if (!this.boundedEvents[eventName]) this.boundedEvents[eventName] = [];
    this.boundedEvents[eventName].push(handler);
  }

  removeEventListener(eventName: string, handler?: EventHandler) {
    if (!this.boundedEvents[eventName]) return;
    if (handler) {
      this.boundedEvents[eventName] = this.boundedEvents[eventName].filter(item => item !== handler);
    } else {
      this.boundedEvents[eventName] = [];
    }
  }

  removeAllEventListener() {
    this.boundedEvents = {};
  }

  trigger(eventName: string, args?: any) {
    if (this.boundedEvents[eventName]) {
      this.boundedEvents[eventName].forEach(handler => {
        handler.call(null, args)
      })
    }
  }

  destroy() {
    this.removeAllEventListener()
  }
}

export const GlobalEvent = new _GlobalEvent();
