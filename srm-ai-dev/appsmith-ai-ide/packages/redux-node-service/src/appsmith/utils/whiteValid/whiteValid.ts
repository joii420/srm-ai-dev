import { getPageElemById } from "utils/hooks/useDomHelper";

/***校验按钮白名单 */
export const WhiteBtnsValid = (e: any, containerEl?: Element, ps?: string) => {
  //commit、insert这种需要走校验，不能白名单放过
  const el = containerEl ?? getPageElemById("GlobalLayoutRightToolbar", ps);
  if (!el) {
    return null;
  }
  const notValidId = ["cancel"]; ////"commit", "insert"
  const rightBtns = el?.querySelectorAll("li.e-menu-item:not(.e-disabled)");
  const whiteBtnList = Array.from(rightBtns)?.filter((btn: any) =>
    notValidId.includes(btn.id),
  );
  return !!whiteBtnList.find((li) => li?.contains(e.target));
};

/**校验当前组件是否在弹窗环境，返回白名单判断 */
export const whiteListValid = (e: any, currentEl: any) => {
  const currentModal = (e.target as Element)?.closest(
    ".bp3-overlay-content",
  ) as Element;
  const currentDialog =
    currentModal ||
    ((e.target as Element)?.closest(".rc-dialog-root") as Element);
  if (!currentDialog) {
    return null;
  }
  const isInDialog = currentDialog.contains(currentEl);
  let inWhiteList = !isInDialog;
  if (isInDialog) {
    const isWhiteBtn = WhiteBtnsValid(e, currentDialog);
    const isCloseBtn =
      (e.target as Element).classList.contains("rc-dialog-close") ||
      (e.target as Element).classList.contains("whiteBtn") ||
      // 点击目标可能是whiteBtn的子节点
      (e.target as Element).parentElement?.classList.contains("whiteBtn");
    const isFullScreenBtn = !!currentDialog
      ?.querySelector(".rc-dialog-header .cursor-pointer")
      ?.contains(e.target);
    inWhiteList = isWhiteBtn || isCloseBtn || isFullScreenBtn;
  } else {
    inWhiteList = true;
  }
  return inWhiteList;
};

const whiteTopMenuValid = (e: any) => {};

/**判断是否点击目标是白名单 */
export const WhiteValid = (e: any, currentEl: any, ps?: string) => {
  // 弹框设置为白名单,【弹框内的组件校验，弹框不是白名单】
  const inDialog = whiteListValid(e, currentEl);
  //非弹框右侧按钮
  const inRightToolbar = WhiteBtnsValid(e, undefined, ps);
  //顶部导航菜单
  // const inTopMenu = whiteTopMenuValid(e)
  return inDialog || inRightToolbar;
};

export const findParentElement = (ele: any, top: any, target: string) => {
  let current = ele.parentNode;
  while (current.nodeName !== target && top.contains(current)) {
    current = current.parentNode;
  }
  if (current.nodeName !== target) {
    return null;
  }
  return current;
};

export const isLastEditCell = (tableName: string, e: any) => {
  console.log("xxxxxff======");
  const gridForm = document?.querySelector(`#${tableName}_gridcontrolEditForm`);
  // tab 停留在最后一列编辑项
  if (gridForm?.contains(e.target)) {
    const td = findParentElement(e.target, gridForm, "TD");
    const fieldList = gridForm?.querySelectorAll("td.e-rowcell:not(.e-hide)");
    let targetIndex = -1;
    fieldList?.forEach((field, index) => {
      if (field === td) {
        targetIndex = index;
      }
    });
    if (targetIndex === fieldList.length - 1) {
      return true;
    }
  }
  return false;
};
