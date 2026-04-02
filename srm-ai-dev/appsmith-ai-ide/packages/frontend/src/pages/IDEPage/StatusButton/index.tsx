import React, { useState, useCallback } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useEditorStore } from '../../../stores/editorStore';
import { type EditLockState } from '../EditLockBadge';

export type IDEMode = 'readonly-free' | 'readonly-other' | 'editable';

interface CheckoutStep {
  key: string;
  label: string;
}

const CHECKOUT_STEPS: CheckoutStep[] = [
  { key: 'edit_lock_checkout', label: '锁定页面' },
  { key: 'create_container', label: '创建容器' },
  { key: 'inject_ssh_key', label: '注入SSH密钥' },
  { key: 'git_clone', label: '克隆代码' },
  { key: 'sync_appsmith', label: '同步版本' },
  { key: 'load_deps', label: '加载依赖' },
  { key: 'inject_skills', label: 'AI技能注入' },
  { key: 'health_check', label: '健康检查' },
  { key: 'finalize', label: '环境就绪' },
];

interface StatusButtonProps {
  mode: IDEMode;
  pageId: string;
  checkedOutBy?: string | null;
  onCheckoutComplete: () => void;
  onSaveAll?: () => Promise<void>;
  editLockState?: EditLockState | null;
  onRefreshEditLock?: () => void;
}

type DialogPhase =
  | 'idle'
  | 'checkout-confirm'      // 签出确认弹框
  | 'checkin-unsaved'        // 签入：存在未保存文件
  | 'checkin-discard'        // 签入：确认丢弃未保存内容
  | 'checkin-message'        // 签入：输入 commit message
  | 'checkin-submitting'     // 签入：提交中
  | 'checkin-expired'        // 签入：容器已失效，可强制释放
  | 'checkin-force-releasing' // 强制释放中
  | 'abandon-confirm'        // 退出：确认还原所有变更
  | 'abandon-submitting';    // 退出：销毁中

const stateLabel = (state?: string) => {
  switch (state) {
    case '1': return '已签入';
    case '2': return '已签出';
    default: return state ?? '-';
  }
};

const StatusButton: React.FC<StatusButtonProps> = ({
  mode,
  pageId,
  checkedOutBy,
  onCheckoutComplete,
  onSaveAll,
  editLockState,
  onRefreshEditLock,
}) => {
  const { token } = useAuthStore();
  const hasUnsavedFiles = useEditorStore((s) => s.hasUnsavedFiles);
  const [hover, setHover] = useState(false);

  // Checkout progress state
  const [checkoutInProgress, setCheckoutInProgress] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogPhase, setDialogPhase] = useState<DialogPhase>('idle');
  const [commitMessage, setCommitMessage] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Checkout                                                         */
  /* ---------------------------------------------------------------- */

  const startCheckout = useCallback(() => {
    setCheckoutInProgress(true);
    setCurrentStepIndex(0);
    setError(null);
    setDialogPhase('idle');

    fetch(`/api/pages/${pageId}/checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const readStream = (): Promise<void> => {
          return reader.read().then(({ done, value }) => {
            if (done) {
              setCheckoutInProgress(false);
              onCheckoutComplete();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              // SSE format: "data:{...}" or "data: {...}"
              if (line.startsWith('data:')) {
                const jsonStr = line.startsWith('data: ') ? line.slice(6) : line.slice(5);
                try {
                  const data = JSON.parse(jsonStr) as {
                    step?: string;
                    status?: string;
                    error?: string;
                    message?: string;
                  };

                  if (data.step === 'error' || data.status === 'failed') {
                    setError(data.message ?? data.error ?? '签出失败');
                    setCheckoutInProgress(false);
                    return;
                  }

                  if (data.step && data.step !== 'done') {
                    const stepIdx = CHECKOUT_STEPS.findIndex((s) => s.key === data.step);
                    if (stepIdx >= 0) {
                      if (data.status === 'in_progress' || data.status === 'started') {
                        setCurrentStepIndex(stepIdx);
                      } else if (data.status === 'completed') {
                        setCurrentStepIndex(stepIdx + 1);
                      }
                    }
                  }

                  if (data.step === 'done' && data.status === 'completed') {
                    setCurrentStepIndex(CHECKOUT_STEPS.length);
                    setCheckoutInProgress(false);
                    onCheckoutComplete();
                    return;
                  }
                } catch {
                  // Ignore malformed SSE data
                }
              }
            }

            return readStream();
          });
        };

        return readStream();
      })
      .catch((err: Error) => {
        setError(err.message || '签出失败');
        setCheckoutInProgress(false);
      });
  }, [pageId, token, onCheckoutComplete]);

  const handleCheckoutClick = useCallback(() => {
    setDialogPhase('checkout-confirm');
  }, []);

  const handleCheckoutConfirm = useCallback(() => {
    startCheckout();
  }, [startCheckout]);

  /* ---------------------------------------------------------------- */
  /*  Checkin                                                          */
  /* ---------------------------------------------------------------- */

  const handleCheckinClick = useCallback(() => {
    setDialogError(null);
    setError(null);
    setCommitMessage('');

    if (hasUnsavedFiles()) {
      setDialogPhase('checkin-unsaved');
    } else {
      setDialogPhase('checkin-message');
    }
  }, [hasUnsavedFiles]);

  const handleSaveAndContinue = useCallback(async () => {
    try {
      if (onSaveAll) await onSaveAll();
      setDialogPhase('checkin-message');
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : String(err));
      setDialogPhase('idle');
    }
  }, [onSaveAll]);

  const submitCheckin = useCallback(async (message: string) => {
    setDialogPhase('checkin-submitting');
    setDialogError(null);

    try {
      const response = await fetch(`/api/pages/${pageId}/checkin`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commitMessage: message }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as {
          error?: string;
          message?: string;
        };

        if (response.status === 409 && body.error === 'GIT_CONFLICT') {
          setDialogError(body.message || 'Git冲突，请先解决冲突后重试');
          setDialogPhase('checkin-message');
          return;
        }

        if (response.status === 404 && body.error === 'NotFound') {
          setDialogError('容器已失效：' + (body.message || ''));
          setDialogPhase('checkin-expired');
          return;
        }

        throw new Error(body.message || `签入失败 (HTTP ${response.status})`);
      }

      // Check for appsmith sync errors (git push succeeded but sync had issues)
      const result = await response.json().catch(() => ({})) as {
        success?: boolean;
        commitHash?: string;
        appsmithSyncErrors?: string[];
      };

      if (result.appsmithSyncErrors && result.appsmithSyncErrors.length > 0) {
        const errMsg = '代码已提交，但Appsmith同步入库失败：' + result.appsmithSyncErrors.join('; ');
        setDialogError(errMsg);
        // Still complete the checkout since git push succeeded
        setTimeout(() => {
          onCheckoutComplete();
        }, 3000);
        return;
      }

      setDialogPhase('idle');
      setCommitMessage('');
      onCheckoutComplete();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : String(err));
      setDialogPhase('checkin-message');
    }
  }, [pageId, token, onCheckoutComplete]);

  const handleCommitSubmit = useCallback(() => {
    const trimmed = commitMessage.trim();
    if (!trimmed || trimmed.length > 200) return;
    void submitCheckin(trimmed);
  }, [commitMessage, submitCheckin]);

  /* ---------------------------------------------------------------- */
  /*  Abandon (退出)                                                    */
  /* ---------------------------------------------------------------- */

  const handleAbandonClick = useCallback(() => {
    setDialogError(null);
    setError(null);
    setDialogPhase('abandon-confirm');
  }, []);

  const submitAbandon = useCallback(async () => {
    setDialogPhase('abandon-submitting');
    setDialogError(null);

    try {
      const response = await fetch(`/api/pages/${pageId}/abandon`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message || `退出失败 (HTTP ${response.status})`);
      }

      setDialogPhase('idle');
      onCheckoutComplete();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : String(err));
      setDialogPhase('abandon-confirm');
    }
  }, [pageId, token, onCheckoutComplete]);

  /* ---------------------------------------------------------------- */
  /*  Force Release (容器失效时强制归还)                                  */
  /* ---------------------------------------------------------------- */

  const submitForceRelease = useCallback(async () => {
    setDialogPhase('checkin-force-releasing');
    setDialogError(null);

    try {
      const response = await fetch(`/api/pages/${pageId}/release`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message || `强制释放失败 (HTTP ${response.status})`);
      }

      setDialogPhase('idle');
      onCheckoutComplete();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : String(err));
      setDialogPhase('checkin-expired');
    }
  }, [pageId, token, onCheckoutComplete]);

  /* ---------------------------------------------------------------- */
  /*  Common                                                           */
  /* ---------------------------------------------------------------- */

  const handleCancel = useCallback(() => {
    setDialogPhase('idle');
    setDialogError(null);
    setCommitMessage('');
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Render: checkout progress overlay                                */
  /* ---------------------------------------------------------------- */

  if (checkoutInProgress || error) {
    return (
      <div className="loading-screen on">
        {!error && <div className="spin" />}
        <p className="load-h">
          {error ? '签出失败' : '正在初始化开发环境'}
        </p>

        {/* Step progress list */}
        <div className="steps">
          {CHECKOUT_STEPS.map((step, idx) => {
            let cls = 'step';
            if (idx < currentStepIndex) cls += ' done';
            else if (idx === currentStepIndex && !error) cls += ' act';

            return (
              <div key={step.key} className={cls}>
                <span className="lsi">
                  {idx < currentStepIndex ? '\u2713' : idx === currentStepIndex && !error ? '\u25CF' : '\u25CB'}
                </span>
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="loading-card" style={{ marginTop: 12 }}>
            <p className="lc-error" style={{ textAlign: 'center' }}>{error}</p>
            <div className="dialog-buttons">
              <button className="btn btn-p" onClick={() => { setError(null); startCheckout(); }}>
                重试
              </button>
              <button className="btn btn-grey" style={{ cursor: 'pointer' }} onClick={() => setError(null)}>
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render: dialogs                                                  */
  /* ---------------------------------------------------------------- */

  // 签出确认
  if (dialogPhase === 'checkout-confirm') {
    return (
      <div className="loading-screen on">
        <div className="loading-card">
          <p className="lc-title">确认签出</p>
          <p className="dialog-text">
            签出后将创建独立开发容器，是否继续？
          </p>
          <div className="dialog-buttons">
            <button className="btn btn-p" onClick={handleCheckoutConfirm}>
              确定
            </button>
            <button className="btn btn-grey" style={{ cursor: 'pointer' }} onClick={handleCancel}>
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 签入：未保存提示
  if (dialogPhase === 'checkin-unsaved') {
    return (
      <div className="loading-screen on">
        <div className="loading-card">
          <p className="lc-title">签入</p>
          <p className="dialog-text">
            存在未保存的文件，是否在签入前保存？
          </p>
          {dialogError && <p className="lc-error">{dialogError}</p>}
          <div className="dialog-buttons">
            <button className="btn btn-green" onClick={() => void handleSaveAndContinue()}>
              保存
            </button>
            <button className="btn btn-orange" onClick={() => setDialogPhase('checkin-discard')}>
              不保存
            </button>
            <button className="btn btn-grey" style={{ cursor: 'pointer' }} onClick={handleCancel}>
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 签入：丢弃确认
  if (dialogPhase === 'checkin-discard') {
    return (
      <div className="loading-screen on">
        <div className="loading-card">
          <p className="lc-title">确认</p>
          <p className="dialog-text">
            未保存的改动将永久丢失，确认继续签入？
          </p>
          <div className="dialog-buttons">
            <button className="btn btn-orange" onClick={() => setDialogPhase('checkin-message')}>
              确认
            </button>
            <button className="btn btn-grey" style={{ cursor: 'pointer' }} onClick={handleCancel}>
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 签入：输入 commit message
  if (dialogPhase === 'checkin-message' || dialogPhase === 'checkin-submitting') {
    const isSubmitting = dialogPhase === 'checkin-submitting';
    const trimmed = commitMessage.trim();
    const isValid = trimmed.length > 0 && trimmed.length <= 200;

    return (
      <div className="loading-screen on">
        <div className="loading-card">
          <p className="lc-title">签入 - 提交信息</p>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="请输入提交信息（必填，最多200字符）"
            maxLength={200}
            disabled={isSubmitting}
            className="commit-input"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid && !isSubmitting) {
                handleCommitSubmit();
              }
            }}
          />
          <p className="char-count">
            {trimmed.length} / 200
          </p>
          {dialogError && <p className="lc-error">{dialogError}</p>}
          <div className="dialog-buttons">
            <button
              className="btn btn-green"
              style={{
                opacity: isValid && !isSubmitting ? 1 : 0.5,
                cursor: isValid && !isSubmitting ? 'pointer' : 'not-allowed',
              }}
              onClick={handleCommitSubmit}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? '签入中...' : '签入'}
            </button>
            <button
              className="btn btn-grey"
              style={{ cursor: 'pointer' }}
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 签入：容器失效，可强制释放
  if (dialogPhase === 'checkin-expired' || dialogPhase === 'checkin-force-releasing') {
    const isReleasing = dialogPhase === 'checkin-force-releasing';

    return (
      <div className="loading-screen on">
        <div className="loading-card">
          <p className="lc-title">容器已失效</p>
          <p className="dialog-text">
            当前容器已失效，无法正常签入。点击"强制归还"可释放页面，恢复可签出状态。
          </p>
          {dialogError && <p className="lc-error">{dialogError}</p>}
          <div className="dialog-buttons">
            <button
              className="btn btn-amb"
              onClick={() => void submitForceRelease()}
              disabled={isReleasing}
              style={{
                opacity: isReleasing ? 0.5 : 1,
                cursor: isReleasing ? 'not-allowed' : 'pointer',
              }}
            >
              {isReleasing ? '释放中...' : '强制归还'}
            </button>
            <button
              className="btn btn-grey"
              style={{ cursor: 'pointer' }}
              onClick={handleCancel}
              disabled={isReleasing}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 退出：确认还原
  if (dialogPhase === 'abandon-confirm' || dialogPhase === 'abandon-submitting') {
    const isSubmitting = dialogPhase === 'abandon-submitting';

    return (
      <div className="loading-screen on">
        <div className="loading-card">
          <p className="lc-title">退出确认</p>
          <p className="dialog-text">
            是否还原本次所有变更内容？退出后容器将被销毁，未推送的代码变更将丢失。
          </p>
          {dialogError && <p className="lc-error">{dialogError}</p>}
          <div className="dialog-buttons">
            <button
              className="btn btn-red"
              onClick={() => void submitAbandon()}
              disabled={isSubmitting}
              style={{
                opacity: isSubmitting ? 0.5 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? '退出中...' : '确定'}
            </button>
            <button
              className="btn btn-grey"
              style={{ cursor: 'pointer' }}
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render: mode buttons                                             */
  /* ---------------------------------------------------------------- */

  if (mode === 'readonly-free') {
    const lockPs = editLockState?.pageState;
    const btnText = editLockState?.button ?? '签出';

    // Click behavior determined solely by button text
    const handleBtnClick = () => {
      if (btnText === '签出') {
        handleCheckoutClick();
      } else if (btnText === '已签出') {
        onRefreshEditLock?.();
      } else if (btnText === '签入') {
        handleCheckinClick();
      }
    };

    const btnClass = btnText === '签出' ? 'btn btn-p'
      : btnText === '签入' ? 'btn btn-green'
      : 'btn btn-grey';

    return (
      <div
        style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <button className={btnClass} onClick={handleBtnClick}>
          {btnText}
        </button>
        {hover && lockPs && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              background: 'var(--s2)',
              border: '1px solid var(--b2)',
              borderRadius: 6,
              padding: '8px 12px',
              zIndex: 300,
              minWidth: 220,
              boxShadow: '0 4px 14px rgba(0,0,0,.4)',
              fontSize: 11,
              color: 'var(--t2)',
              lineHeight: 1.8,
              whiteSpace: 'nowrap',
            }}
          >
            <div><span style={{ color: 'var(--t3)' }}>程序：</span><span style={{ color: 'var(--t1)' }}>{lockPs.code ?? '-'}</span></div>
            <div><span style={{ color: 'var(--t3)' }}>状态：</span><span style={{ color: 'var(--t1)' }}>{stateLabel(lockPs.state)}</span></div>
            <div><span style={{ color: 'var(--t3)' }}>操作人：</span><span style={{ color: 'var(--t1)' }}>{lockPs.acct ?? '-'}</span></div>
            <div><span style={{ color: 'var(--t3)' }}>IP：</span><span style={{ color: 'var(--t1)' }}>{lockPs.ip ?? '-'}</span></div>
            <div><span style={{ color: 'var(--t3)' }}>时间：</span><span style={{ color: 'var(--t1)' }}>{lockPs.time ?? '-'}</span></div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'editable') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn btn-green" onClick={handleCheckinClick}>
          签入
        </button>
        <button className="btn btn-orange" onClick={handleAbandonClick}>
          退出
        </button>
      </div>
    );
  }

  // readonly-other
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {checkedOutBy && (
        <span style={{ color: 'var(--t2)', fontSize: 12 }}>
          已被 {checkedOutBy} 签出
        </span>
      )}
      <button className="btn btn-grey" onClick={onCheckoutComplete}>
        已签出
      </button>
    </div>
  );
};

export default StatusButton;
