export function isFocusInInputWidget() {
  if (!document.activeElement) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(
    document.activeElement.tagName,
  );
}

export function isModalOpen() {
  const isModal =
    document.getElementsByClassName("t--modal-widget").length > 0 ||
    document.getElementsByClassName("e-dlg-content").length > 0 ||
    document.getElementsByClassName("rc-dialog-root").length > 0;
  return isModal;
}

const KeyActionMap: any = {
  "Alt+i": "insert",
  "Alt+r": "delete",
  "Alt+q": "query",
  "Alt+m": "edit",
  "Alt+c": "copy",
  "Alt+p": "print",
  "Alt+x": "export",
  "ctr+Enter": "commit",
  esc: "cancel",
};

export function getActionNameByKeyEvent(e: KeyboardEvent) {
  let key = "";
  if (e.altKey) {
    key = `Alt+${e.key.toLowerCase()}`;
  } else if (e.ctrlKey) {
    key = `ctr+${e.key}`;
  } else if (e.key === "Escape") {
    key = "esc";
  }
  return KeyActionMap[key];
}
