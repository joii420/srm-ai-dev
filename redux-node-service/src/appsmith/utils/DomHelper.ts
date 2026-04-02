import { getPageElemById } from "./hooks/useDomHelper";

export const App_View_Scroll_Container_Id = "app-viewer-scroll-container";

export class GlobalScrollDomHelper {
  private static prevOverflowY = "";
  private static isInTask = false;
  private static timer: number | null = null;
  private static clearFn = () => {};

  // 禁用PAGE模式最外层滚动
  static disableGlobalScrollIfNeed(ps?: string) {
    const scrollNode = getPageElemById(App_View_Scroll_Container_Id, ps);
    const isNeed =
      scrollNode && scrollNode.scrollHeight <= scrollNode.clientHeight;
    if (this.timer) {
      // 重复调用的情况刷新timeout时间
      this.clearDisable();
    }
    if (isNeed && !this.isInTask) {
      this.isInTask = true;
      this.prevOverflowY = scrollNode.style.overflowY || "";
      scrollNode.style.overflowY = "hidden";
      this.clearFn = () => {
        scrollNode.style.overflowY = this.prevOverflowY;
        this.prevOverflowY = "";
        this.isInTask = false;
      };
    }
  }

  // 清除禁用
  static clearDisable() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.timer = setTimeout(() => {
      this.clearFn();
      this.clearFn = () => {};
      this.timer = null;
    }, 400);
  }
}

export function findTargetElementByCls(el: Element | null, cls: string) {
  while (el && el !== document.body) {
    if (el.classList.contains(cls)) return el;
    el = el.parentElement;
  }
  return null;
}

// 判断childDOM节点是否被parentDOM节点包含,
export function isChildOf(child: any, parent: any) {
  while (child && child !== document.body) {
    if (child === parent) return true;
    child = child.parentElement;
  }
  return false;
}

export function copyTextToClipboard(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);

  textarea.select();
  textarea.setSelectionRange(0, 99999);

  try {
    document.execCommand("copy");
  } catch (error) {
    console.error("copy error");
  } finally {
    document.body.removeChild(textarea);
  }
}
