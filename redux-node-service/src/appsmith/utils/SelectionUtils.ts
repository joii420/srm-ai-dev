/**
 * 通过点击坐标得到输入框内部的字符索引（caret 位置）。
 * 兼容普通 <input>、<textarea>，不依赖 selectionStart。
 *
 * @param {HTMLInputElement|HTMLTextAreaElement} el
 * @param {number} clientX - 鼠标事件的 clientX
 * @param {number} clientY - 鼠标事件的 clientY
 * @return {number} caret index (0 .. value.length)
 */
export function getCaretIndexFromPoint(
  el: any,
  clientX: number,
  clientY: number,
) {
  // 1?? 创建一个隐藏的镜像容器，用来测量每个字符的宽度
  const div = document.createElement("div");
  const style = getComputedStyle(el);
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  // 把所有可能影响宽度的样式复制过去
  [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "letterSpacing",
    "textTransform",
    "textIndent",
    "boxSizing",
    "borderLeftWidth",
    "borderRightWidth",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "paddingBottom",
    "lineHeight",
    "direction",
    "textAlign",
  ].forEach((prop: any) => (div.style[prop] = style[prop]));

  // 2?? 把输入框的内容放进 div，用 <span> 包裹每个字符
  const value = el.value;
  const fragments = [];
  for (let i = 0; i < value.length; i++) {
    const span = document.createElement("span");
    span.textContent = value[i];
    // 把每个字符的坐标放进 data-index，后面找最近的即可
    span.dataset.index = i;
    fragments.push(span);
  }
  // 添加一个占位的空字符（光标可以在末尾）
  const tail = document.createElement("span");
  tail.dataset.index = value.length;
  tail.innerHTML = "&nbsp;";
  fragments.push(tail);

  fragments.forEach((node) => div.appendChild(node));
  document.body.appendChild(div);

  // 3?? 把镜像 div 放到和原始输入框同样的页面坐标
  const rect = el.getBoundingClientRect();
  div.style.left = `${rect.left + window.scrollX}px`;
  div.style.top = `${rect.top + window.scrollY}px`;
  div.style.width = `${rect.width}px`;
  div.style.height = `${rect.height}px`;
  div.style.overflow = "hidden";

  // 4?? 用元素的坐标找最近的 span
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  let bestIdx = value.length; // 默认放在末尾
  let minDist = Infinity;
  div.childNodes.forEach((node) => {
    // @ts-ignore
    const spanRect = node.getBoundingClientRect();
    const spanRectLeft = spanRect.left;
    const spanRectWidth = spanRect.width;
    const cx1 = spanRectLeft - rect.left;
    const cx2 = spanRectLeft + spanRectWidth - rect.left;
    // const cx = spanRect.left + spanRect.width / 2 - 1 - rect.left;
    const cy = spanRect.top + spanRect.height / 2 - 1 - rect.top;
    const d1 = Math.hypot(cx1 - x, cy - y);
    const d2 = Math.hypot(cx2 - x, cy - y);
    if (d1 < minDist) {
      minDist = d1;
      bestIdx = Number(node.dataset.index);
    }
    if (d2 < minDist) {
      minDist = d1;
      bestIdx = Number(node.dataset.index) + 1;
    }
  });

  // 5?? 清理
  document.body.removeChild(div);
  return bestIdx;
}

export function formatMouseDownEventWhenValid(e: MouseEvent) {
  const el = e.target as Element;
  if (el && ['INPUT', 'TEXTAREA'].includes(el.tagName) && e.type === 'pointerdown') {
    try {
      const targetIndex = getCaretIndexFromPoint(el, e.clientX, e.clientY)
      // @ts-ignore
      el.selectionStart = targetIndex;
      // @ts-ignore
      el.selectionEnd = targetIndex;
    } catch(e) {
      // 避免没有焦点input报错
    }
  }
}
