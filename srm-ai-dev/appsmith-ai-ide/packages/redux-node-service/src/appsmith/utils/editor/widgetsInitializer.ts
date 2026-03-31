import Widgets from "widgets";
import { registerWidgets } from "WidgetProvider/factory/registrationHelper";
// import { numberFormatListLocale } from "@syncfusion/ej2-richtexteditor/src/rich-text-editor/models/default-locale";
// // 源码修改: 修复richtexteditor组件中numberFormatList下拉国际化问题
// numberFormatListLocale[2].value = "lowerAlpha";
// numberFormatListLocale[3].value = "upperAlpha";
// numberFormatListLocale[4].value = "lowerRoman";
// numberFormatListLocale[5].value = "upperRoman";
// numberFormatListLocale[6].value = "lowerGreek";

function widgetsInitializer() {
  registerWidgets(Widgets);
}

export default widgetsInitializer;
