import { getAppsmithConfigs } from "@appsmith/configs";
import FormControlRegistry from "./formControl/FormControlRegistry";
import type { LogLevelDesc } from "loglevel";
import localStorage from "utils/localStorage";
import * as log from "loglevel";
import Modal from "react-modal";

export const appInitializer = () => {
  FormControlRegistry.registerFormControlBuilders();
  const appsmithConfigs = getAppsmithConfigs();
  log.setLevel(getEnvLogLevel(appsmithConfigs.logLevel));

  // For accessibility (https://reactcommunity.org/react-modal/accessibility/)
  if (process.env.NODE_ENV !== "test") {
    Modal.setAppElement("#root");
  }
};

const getEnvLogLevel = (configLevel: LogLevelDesc): LogLevelDesc => {
  let logLevel = configLevel;
  if (localStorage && localStorage.getItem) {
    const localStorageLevel = localStorage.getItem(
      "logLevelOverride",
    ) as LogLevelDesc;
    if (localStorageLevel) logLevel = localStorageLevel;
  }
  return logLevel;
};

export const exitFullscreen = () => {
  if ("exitFullscreen" in document) {
    document.exitFullscreen();
  } else if ("webkitExitFullscreen" in document) {
    (document as any).webkitExitFullscreen();
  } else if ("mozExitFullscreen" in document) {
    (document as any).mozExitFullscreen();
  } else if ("msExitFullscreen" in document) {
    (document as any).msExitFullscreen();
  } else {
    console.error("Fullscreen API is not supported");
  }
};

export const requestFullscreen = (element: any) => {
  if (element?.requestFullscreen) {
    element.requestFullscreen();
  } else if (element?.webkitRequestFullscreen) {
    element?.webkitRequestFullscreen();
  } else if (element?.mozRequestFullscreen) {
    element?.mozRequestFullscreen();
  } else if (element?.msRequestFullscreen) {
    element?.msRequestFullscreen();
  } else {
    console.error("Fullscreen API is not supported");
  }
};
