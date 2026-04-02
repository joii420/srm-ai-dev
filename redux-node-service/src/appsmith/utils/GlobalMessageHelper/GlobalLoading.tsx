import React, { useState, useEffect } from "react";
import styled from "styled-components";

const LoadingWrapper = styled.div<{
  zIndex: number;
  maskBackground: string;
}>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${(props) => props.zIndex};

  @keyframes loading-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .mask {
    width: 100%;
    height: 100%;
    background: ${(props) => props.maskBackground};
  }
  .content {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    padding: 20px 30px;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 3px 10px 2px rgba(0, 0, 0, 0.16);
    svg {
      margin-right: 8px;
      animation: 1.8s linear 0s infinite normal none running loading-spin;
    }
  }
`

interface Props {
  text?: string;
  zIndex?: number;
  maskBackground?: string;
}

const GlobalLoading: React.FC<Props> = (props) => {
  return (
    <LoadingWrapper
      zIndex={props.zIndex || 9999}
      maskBackground={props.maskBackground || 'rgba(0, 0, 0, 0.3)'}
    >
      <div className="mask" />
      <div className="content">
        <svg
          className="remixicon-icon"
          width="24px"
          height="24px"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm0 15a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1zm8.66-10a1 1 0 0 1-.366 1.366l-2.598 1.5a1 1 0 1 1-1-1.732l2.598-1.5A1 1 0 0 1 20.66 7zM7.67 14.5a1 1 0 0 1-.366 1.366l-2.598 1.5a1 1 0 1 1-1-1.732l2.598-1.5a1 1 0 0 1 1.366.366zM20.66 17a1 1 0 0 1-1.366.366l-2.598-1.5a1 1 0 0 1 1-1.732l2.598 1.5A1 1 0 0 1 20.66 17zM7.67 9.5a1 1 0 0 1-1.366.366l-2.598-1.5a1 1 0 1 1 1-1.732l2.598 1.5A1 1 0 0 1 7.67 9.5z" />
        </svg>
        <span>{props.text || 'Loading...'}</span>
      </div>
    </LoadingWrapper>
  )
}

export default GlobalLoading;
