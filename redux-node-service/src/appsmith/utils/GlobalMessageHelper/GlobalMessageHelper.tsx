import React, { useMemo } from "react";
import GlobalMessage, { type GlobalMessageProps } from "./GlobalMessage";
import ReactDOM from "react-dom";
import GlobalLoading from "./GlobalLoading";
import GlobalInputConfirm, { type GlobalInputConfirmProps } from "./GlobalInputConfirm";

let num = 1;
const MessageMap: any = {};

function getGlobalDialogKey() {
  return `global_dialog_key_${num++}`;
}

const MessageCollector: Record<string, string[]> = {};

export default class GlobalMessageHelper {
  static open(config: GlobalMessageProps, context?: string) {
    const { onConfirm, onCancel, ...rest } = config;
    const key = getGlobalDialogKey();
    const div = document.createElement("div");
    MessageMap[key] = div;
    document.body.append(div);
    ReactDOM.render(
      <GlobalMessage
        key={key}
        {...rest}
        onConfirm={() => {
          onConfirm?.();
          GlobalMessageHelper.close(key);
        }}
        onCancel={() => {
          onCancel?.();
          GlobalMessageHelper.close(key);
        }}
      />,
      div,
    );

    if (context) {
      if (!MessageCollector[context]) MessageCollector[context] = [];
      MessageCollector[context].push(key);
    }

    return key;
  }

  static loading(text?: string, config?: any, context?: string) {
    const key = getGlobalDialogKey();
    const div = document.createElement("div");
    MessageMap[key] = div;
    document.body.append(div);
    ReactDOM.render(
      <GlobalLoading
        key={key}
        text={text}
        zIndex={config?.zIndex}
        maskBackground={config?.maskBackground}
      />,
      div,
    );

    if (context) {
      if (!MessageCollector[context]) MessageCollector[context] = [];
      MessageCollector[context].push(key);
    }

    return key;
  }

  static inputConfirm(config: GlobalInputConfirmProps, context?: string) {
    const { onConfirm, onCancel, ...rest } = config;
    const key = getGlobalDialogKey();
    const div = document.createElement("div");
    MessageMap[key] = div;
    document.body.append(div);
    ReactDOM.render(
      <GlobalInputConfirm
        key={key}
        {...rest}
        onConfirm={(text) => {
          const result = onConfirm?.(text);
          if (result === false) return;
          GlobalMessageHelper.close(key);
        }}
        onCancel={() => {
          onCancel?.();
          GlobalMessageHelper.close(key);
        }}
      />,
      div,
    );

    if (context) {
      if (!MessageCollector[context]) MessageCollector[context] = [];
      MessageCollector[context].push(key);
    }

    return key;
  }

  static close(key: string) {
    const node = MessageMap[key] as HTMLDivElement;
    if (node) {
      ReactDOM.unmountComponentAtNode(node);
      node.remove();
      delete MessageMap[key];
    }
  }

  static closeByContext(context: string) {
    const keys = MessageCollector[context] || [];
    keys.forEach((key) => GlobalMessageHelper.close(key));
    MessageCollector[context] = [];
  }
}
