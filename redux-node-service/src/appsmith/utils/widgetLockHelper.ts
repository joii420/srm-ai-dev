import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import type BaseWidget from "widgets/BaseWidget";
import { actionDynamicStringAddParams } from "widgets/SFAgGridWidget/widget/utils";

type BaseWidgetAny = BaseWidget<any, any>;

interface Locker {
  [actionName: string]: {
    dependency: string[];
    isLock?: boolean;
  };
}

class WidgetLockHelper {
  lockStore: Locker = {};
  parent: BaseWidgetAny;
  localLock: { [actionName: string]: () => void } = {};

  constructor(parent: BaseWidgetAny) {
    this.parent = parent;
  }

  registerLocker(actionLocker: Locker) {
    this.lockStore = {
      ...actionLocker,
    };
  }

  isLocked(actionName: string, inValidActionNames: any = {}): boolean {
    const locker = this.lockStore[actionName];
    if (!locker) return false;
    inValidActionNames[actionName] = !!locker.isLock;
    const flag =
      !!locker.isLock ||
      locker.dependency.some(
        (name) =>
          inValidActionNames[name] ?? this.isLocked(name, inValidActionNames),
      );
    inValidActionNames[actionName] = flag;

    return flag;
  }

  private lock(actionName: string) {
    const locker = this.lockStore[actionName];
    if (!locker) return;

    locker.isLock = true;
  }

  private unlock(actionName: string) {
    const locker = this.lockStore[actionName];
    if (!locker) return;

    locker.isLock = false;
  }

  runExecuteAction(actionName: string, jsString?: string, params?: any[]) {
    if (jsString && !this.isLocked(actionName)) {
      let dynamicString = jsString;
      if (params?.length) {
        dynamicString = actionDynamicStringAddParams(jsString, params.map(item => JSON.stringify(item)));
      }
      this.parent.executeAction({
        triggerPropertyName: "onClick",
        dynamicString,
        event: { type: EventType.ON_CLICK },
      });
    }
  }

  async runExecuteActionSync(actionName: string, jsString?: string, params?: any[]) {
    let result: any;
    if (jsString && !this.isLocked(actionName)) {
      try {
        let dynamicString = jsString;
        if (params?.length) {
          dynamicString = actionDynamicStringAddParams(jsString, params.map(item => JSON.stringify(item)));
        }
        this.lock(actionName);
        result = await this.parent.executeActionSync({
          triggerPropertyName: "onClick",
          dynamicString,
          event: { type: EventType.ON_CLICK },
        });
      } catch (e) {
        throw e;
      } finally {
        this.unlock(actionName);
        return [true, result];
      }
    }

    return [false, result];
  }

  runLocalLock(actionName: string) {
    return new Promise((r) => {
      this.localLock[actionName] = r as any;
    });
  }

  unlockLocal(actionName: string) {
    if (this.localLock[actionName]) {
      this.localLock[actionName]();
      delete this.localLock[actionName];
    }
  }

  isLocalLocked(actionName: string): boolean {
    return !!this.localLock[actionName];
  }
}

export default WidgetLockHelper;
