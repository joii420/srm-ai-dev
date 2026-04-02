import { executeTriggerSync } from "actions/widgetActions";
import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import { Toolbar_Action_Success } from "constants/EventConstants";
import React, { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getToolBar, getToolbarConfig } from "selectors/onboardingSelectors";
import { GlobalEvent } from "utils/GlobalEvent.";

export function useToolBar() {
  const dispatch = useDispatch();
  const toolbar = useSelector(getToolBar); //新接口
  //   let toolbarConfig = useSelector(getToolbarConfig);
  let toolbarConfig: any = useRef([]);
  toolbarConfig.current = useSelector(getToolbarConfig);

  let insertClick = false;
  const operate = (action: any) => {
    return new Promise((onSuccess) => {
      dispatch(
        executeTriggerSync({
          triggerPropertyName: "onClick",
          dynamicString: action,
          event: { type: EventType.ON_CLICK },
          onSuccess,
        }),
      );
    });
  };

  const ctrlEnterHandle = useCallback(
    async (e: any) => {
      let isModal =
        document?.getElementsByClassName("t--modal-widget").length > 0
          ? true
          : false;
      let isOpenWindowModal =
        document?.getElementsByClassName("rc-dialog-root").length > 0
          ? true
          : false;
      let key = "";

      const data = toolbarConfig.current.data ?? toolbar;
      const [t] = data;
      const action = t
        ? `${t.taskAction}.${t.action?.replace(/\(.*\)/g, "")}`
        : "";
      if (t) {
        const isEnable = data.find((i: any) => i.id === "commit")?.enabled;
        if (!isModal && !isOpenWindowModal && isEnable) {
          // document.activeElement?.blur();
          document.getElementById("focus-div")?.focus();
          if (insertClick) {
            console.log("====aa无效ctr+Enter 快捷键", e.key);
            return;
          }
          insertClick = true;
          console.log("aaa===栏位调用", e);
          const result = await operate(`${action}("commit")`);
          GlobalEvent.trigger(Toolbar_Action_Success, ["commit"]);
          insertClick = false;
          console.log("====aa 快捷键ctr+Enter 已完成", e.key);
        }
      }
    },
    [toolbarConfig],
  );

  return {
    ctrlEnterHandle,
    operate,
  };
}
