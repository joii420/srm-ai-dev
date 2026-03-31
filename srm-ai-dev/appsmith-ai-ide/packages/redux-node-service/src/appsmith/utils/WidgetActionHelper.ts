class WidgetActionHelper {
  actionCallbackMap: Record<string, ((args: any) => void)[]> = {};

  constructor() {}

  runAfterActionComplete(actionType: string, fn: (args: any) => void) {
    const key = `${actionType}_complete`;
    if (!this.actionCallbackMap[key]) this.actionCallbackMap[key] = [];
    this.actionCallbackMap[key].push(fn);
  }

  run(actionType: string, type: string, args?: any) {
    const key = `${actionType}_${type}`;
    const list = this.actionCallbackMap[key];
    if (list) {
      this.actionCallbackMap[key] = [];
      list.forEach(fn => {
        fn(args);
      })
    }
  }
}

export default WidgetActionHelper
