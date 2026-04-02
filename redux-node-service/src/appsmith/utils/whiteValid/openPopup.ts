import {
  DatePicker,
  DateTimePicker,
  TimePicker,
} from "@syncfusion/ej2-react-calendars";
import { MultiSelect } from "@syncfusion/ej2-react-dropdowns";

/**点击弹出组件附带弹框 */
export const openWidgetPopup = (e: any) => {
  const parent = e.target.parentElement as unknown as HTMLDivElement;
  if (parent) {
    let target;
    const multiSelectWrapper = e.target?.closest(".e-multi-select-wrapper");
    if (multiSelectWrapper) {
      target = multiSelectWrapper?.querySelector(".e-multiselect");
    } else {
      target = parent?.getElementsByClassName("e-input")[0];
    }
    const instance = target?.ej2_instances?.[0];
    const popup = document.getElementById(`${instance?.id}_options`);
    // console.log(">>>>>>>>>>>click", { e, parent, instance, target, popup });
    if (popup) {
      return;
    }
    if (
      instance instanceof DatePicker ||
      instance instanceof DateTimePicker ||
      instance instanceof TimePicker
    ) {
      instance.focusIn();
      setTimeout(() => {
        if (
          (instance as any)?.moduleName === "datetimepicker" &&
          e.target.classList?.contains("e-time-icon")
        ) {
          (instance as DateTimePicker).show("time");
        } else {
          instance.show();
        }
      }, 0);
    } else if (instance instanceof MultiSelect) {
      instance.focusIn();
      //   instance.showPopup();
      setTimeout(() => {
        instance.showPopup();
      }, 0);
    }
  }
};

const getInstance = (e: any) => {
  const parent = e.target.parentElement as unknown as HTMLDivElement;
  if (parent) {
    let target;
    const multiSelectWrapper = e.target?.closest(".e-multi-select-wrapper");
    if (multiSelectWrapper) {
      target = multiSelectWrapper?.querySelector(".e-multiselect");
    } else {
      target = parent?.getElementsByClassName("e-input")[0];
    }
    const instance = target?.ej2_instances?.[0];
    return instance;
  }
  return null;
};

export const checkPopup = (e: any) => {
  const instance = getInstance(e);
  if (instance) {
    const popup = document.getElementById(`${instance?.id}_options`);
    return popup;
  }
  return null;
};
