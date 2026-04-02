// import PropertyControlRegistry from "../PropertyControlRegistry";
// import WidgetFactory from "WidgetProvider/factory";
// import Widgets from "widgets";
// import { registerWidgets } from "WidgetProvider/factory/registrationHelper";
import { registerLayoutComponents } from "layoutSystems/anvil/utils/layouts/layoutUtils";
import { isViewMode } from "utils/envUtils";
import { retryPromise } from "utils/AppsmithUtils";
// import widgets from "widgets";

// const widgetPromise = retryPromise(
//   async () => import(/* webpackChunkName: "registerWidgets" */ "../../widgets"),
// );

export const registerEditorWidgets = () => {
  // 用于开发环境报错提示正常显示
  if (process.env.NODE_ENV === "development") {
    return import(
      /* webpackChunkName: "widgetsInitializer" */ "./widgetsInitializer"
    ).then((module) => {
      module.default();
    });
  }

  return retryPromise(
    async () =>
      import(
        /* webpackChunkName: "widgetsInitializer" */ "./widgetsInitializer"
      ),
  ).then((module) => {
    module.default();
  });
  // return retryPromise(
  //   async () => import(/* webpackChunkName: "registerWidgets" */ "../../widgets"),
  // ).then((module) => {
  //   registerWidgets(module.default);
  // });
};

export const registerPropertyControl = () => {
  return retryPromise(
    async () =>
      import(
        /* webpackChunkName: "registerProperty" */ "../PropertyControlRegistry"
      ),
  ).then((module) => {
    module.default.registerPropertyControlBuilders();
  });
};

let initialPromise: any = null;

export const editorInitializer = async () => {
  if (!initialPromise) {
    initialPromise = new Promise<void>(async (resolve) => {
      const promiseList: any[] = [registerEditorWidgets()];
      if (!isViewMode()) {
        promiseList.push(registerPropertyControl());
      }

      await Promise.all(promiseList);
      // PropertyControlRegistry.registerPropertyControlBuilders();
      // TODO: do this only for anvil.
      registerLayoutComponents();
      resolve();
    });
  }
  await initialPromise;
};
