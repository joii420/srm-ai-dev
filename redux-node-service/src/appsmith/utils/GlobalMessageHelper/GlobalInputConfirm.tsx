import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import ModalComponent from "components/designSystems/appsmith/ModalComponent";
import { ThemeProvider } from "styled-components";
import { getCurrentThemeDetails } from "selectors/themeSelectors";
import rootStore from "store";
import classnames from "classnames";

const MessageWrapper = styled.div`
  position: fixed;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40rem;
  .message-info-container {
    box-shadow: var(--wds-modal-box-shadow);
    border-radius: var(--wds-card-border-radius);
    background: #fff;
    .message-info-title {
      color: var(--wds-font-color);
      font-weight: 600;
      padding: 4px 8px;
      border-bottom: 1px solid var(--wds-border-color);
      display: flex;
      justify-content: space-between;

      .e-icons.e-close {
        width: 20px;
        height: 20px;
        text-align: center;
        line-height: 20px;
        color: #ccc;
        font-size: 15px;
        cursor: pointer;
      }
      .e-icons.e-close:hover {
        border-radius: 2px;
        color: #000;
      }
    }
    .message-info {
      display: flex;
      align-items: center;
      padding: 16px;
      .message-info-label {
        color: var(--wds-label-color);
        flex-shrink: 0;
        margin-right: 8px;
      }
    }
    .message-btn {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 0 16px 8px 16px;
      button {
        line-height: 1;
        font-size: 14px;
        padding: 6px 12px;
        margin-left: 8px;
        color: #fff;
        background: var(--wds-accent-color);
        border-radius: var(--wds-border-radius);
        &:hover {
          background-color: var(--wds-accent-darken-color);
        }
      }
    }
  }
`;

export enum ButtonType {
  refresh = "REFRESH",
  close = "CLOSE",
  back_to_login = "BACK_TO_LOGIN",
}

export interface GlobalInputConfirmProps {
  title: string;
  label?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: (text: string) => any;
  onCancel?: () => void;
  onClose?: () => void;
}

const GlobalInputConfirm: React.FC<GlobalInputConfirmProps> = (props) => {
  const {
    title,
    label,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    onClose,
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  const confirm = (text: string) => {
    onConfirm?.(text);
  };
  const cancel = () => {
    onCancel?.();
  };

  const close = () => {
    onClose?.();
  };

  const renderButton = () => {
    return (
      <div className="message-btn">
        {confirmText ? (
          <button
            className="global-message-btn"
            data-type="default_confirm"
          >
            {confirmText ?? "确认"}
          </button>
        ) : null}
        {cancelText ? (
          <button
            className="global-message-btn"
            data-type="default_cancel"
          >
            {cancelText ?? "取消"}
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
            confirm(inputRef.current?.value || "");
            break;
          case "default_confirm":
            cancel();
            break;
          default:
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
        <MessageWrapper>
          <div className="message-info-container">
            <div className="message-info-title">
              <span>{title ?? ""}</span>
              <span className="e-icons e-close" onClick={cancel} />
            </div>
            <div className="message-info">
              <span className="message-info-label">{label}</span>
              <input className="e-input" ref={inputRef} />
            </div>
            {renderButton()}
          </div>
        </MessageWrapper>
      </ModalComponent>
    </ThemeProvider>
  );
};
export default GlobalInputConfirm;
