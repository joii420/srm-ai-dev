import React, { useEffect } from "react";
import styled from "styled-components";
import ModalComponent from "components/designSystems/appsmith/ModalComponent";
import { ThemeProvider } from "styled-components";
import { getCurrentThemeDetails } from "selectors/themeSelectors";
import rootStore from "store";
import classnames from "classnames";

const MessageWrapper = styled.div<{
  iconBg: string;
  titleColor: string;
  btnColor: string;
}>`
  position: fixed;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  height: 12.2rem;
  width: 40rem;
  display: flex;
  align-items: center;
  .message-icon {
    height: 100%;
    width: 8rem;
    background-color: ${(props) => props.iconBg};
    box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.2);
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    .e-icons {
      font-size: 4rem;
    }
    .e-icons:before {
      color: #fff;
    }
  }
  .message-info-container {
    box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.2);
    border-radius: 5px;
    height: 100%;
    flex: 1;
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    justify-content: space-around;
    padding: 1rem 1rem 0;
    background: #fff;
    .message-info-title {
      color: ${(props) => props.titleColor};
      font-weight: 600;
    }
    .message-info {
      max-height: 5rem;
      overflow: hidden;
      overflow-y: auto;
    }
    .message-btn {
      display: flex;
      align-items: center;
      justify-content: space-around;
      align-self: end;
      button {
        line-height: 2rem;
        font-size: 16px;
        padding: 0 10px;
        margin: 0 0.5rem;
        color: ${(props) => props.btnColor};
        font-weight: 600;
        &:hover {
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: 5px;
        }
      }
    }
  }
`;

type MessageType = "error" | "warn";

const MessageTheme: Record<MessageType, any> = {
  error: {
    iconBg: "rgb(199, 56, 79)",
    titleColor: "red",
    btnColor: "rgb(204, 77, 96)",
  },
  warn: {
    iconBg: "rgb(161, 121, 0)",
    titleColor: "rgb(161, 121, 0)",
    btnColor: "rgb(161, 121, 0)",
  },
};

export enum ButtonType {
  refresh = "REFRESH",
  close = "CLOSE",
  back_to_login = "BACK_TO_LOGIN",
}

export interface GlobalMessageProps {
  type: MessageType;
  title: string;
  message: any;
  icon?: string;
  color?: string;
  confirmText?: string;
  cancelText?: string;
  button?: { label: string; type: ButtonType }[];
  onButtonClick?: (type: ButtonType) => void;
  onConfirm?: () => any;
  onCancel?: () => void;
  onClose?: () => void;
}

const GlobalMessage: React.FC<GlobalMessageProps> = (props) => {
  const {
    type,
    title,
    message,
    confirmText,
    cancelText,
    button,
    icon,
    color,
    onButtonClick,
    onConfirm,
    onCancel,
    onClose,
  } = props;

  const confirm = () => {
    onConfirm?.();
  };
  const cancel = () => {
    onCancel?.();
  };

  const close = () => {
    onClose?.();
  };

  const renderButton = () => {
    if (button) {
      return (
        <div className="message-btn">
          {button.map((btn) => (
            <button
              className="global-message-btn"
              data-type={btn.type}
              key={btn.type}
              // onClick={() => onButtonClick?.(btn.type)}
            >
              {btn.label ?? ""}
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className="message-btn">
        {confirmText ? (
          <button
            className="global-message-btn"
            data-type="default_confirm"
            // onClick={confirm}
          >
            {confirmText ?? ""}
          </button>
        ) : null}
        {cancelText ? (
          <button
            className="global-message-btn"
            data-type="default_cancel"
            // onClick={cancel}
          >
            {cancelText ?? ""}
          </button>
        ) : null}
      </div>
    );
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target: HTMLButtonElement | null = (
        e.target as HTMLElement
      )?.closest?.(".global-message-btn");
      if (target) {
        const type = target.getAttribute("data-type");
        switch (type) {
          case "default_confirm":
            confirm();
            break;
          case "default_confirm":
            cancel();
            break;
          default:
            onButtonClick?.(type as any);
            break;
        }
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return (
    <ThemeProvider theme={getCurrentThemeDetails(rootStore.getState())}>
      <ModalComponent
        canEscapeKeyClose
        canOutsideClickClose={false}
        isOpen
        onClose={close}
        overlayClassName="manual-upgrades-overlay"
        portalClassName="global-message-portal"
        scrollContents
        width={660}
      >
        <MessageWrapper
          {...(color
            ? { iconBg: color, titleColor: color, btnColor: color }
            : MessageTheme[type])}
        >
          <div className="message-icon">
            <div
              className={classnames(
                "e-icons",
                icon
                  ? icon
                  : {
                      "e-circle-close": type === "error",
                      "e-warning": type === "warn",
                    },
              )}
            />
          </div>
          <div className="message-info-container">
            <div className="message-info-title">{title ?? ""}</div>
            <div className="message-info">{message ?? ""}</div>
            {renderButton()}
          </div>
        </MessageWrapper>
      </ModalComponent>
    </ThemeProvider>
  );
};
export default GlobalMessage;
