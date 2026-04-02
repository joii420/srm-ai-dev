// Node.js: copy-to-clipboard removed, clipboard not available in server context
import AppsmithConsole from "utils/AppsmithConsole";
import { ActionValidationError } from "sagas/ActionExecution/errorUtils";
import { getType, Types } from "utils/TypeHelpers";
import type { TCopyToClipboardDescription } from "workers/Evaluation/fns/copyToClipboard";

export default function copySaga(action: TCopyToClipboardDescription) {
  const { payload } = action;
  if (typeof payload.data !== "string") {
    throw new ActionValidationError(
      "COPY_TO_CLIPBOARD",
      "data",
      Types.STRING,
      getType(payload.data),
    );
  }
  console.debug("[copy]", payload.data);
  AppsmithConsole.info({
    text: `copyToClipboard('${payload.data}') was triggered`,
  });
}
