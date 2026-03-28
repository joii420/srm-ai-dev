import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../services/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ContainerInfo {
  containerId: string;
  checkoutId: string;
  pageId: string;
  pageName: string;
  checkedOutBy: {
    username: string;
    displayName: string;
  };
  checkedOutAt: string | null;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ContainerOpsPage: React.FC = () => {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    checkoutId: string;
    type: 'checkin' | 'destroy';
  } | null>(null);
  const [destroyDoubleConfirm, setDestroyDoubleConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchContainers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{ containers: ContainerInfo[] }>('/containers');
      setContainers(res.data.containers);
      setError(null);
    } catch {
      setError('获取容器列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchContainers();
  }, [fetchContainers]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchContainers();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchContainers]);

  const handleForceCheckin = async (checkoutId: string) => {
    setActionLoading(checkoutId);
    setSuccessMsg(null);
    try {
      const res = await apiClient.post<{ success: boolean; commitMessage: string }>(
        `/containers/${checkoutId}/force-checkin`,
      );
      setSuccessMsg(`强制签入成功: ${res.data.commitMessage}`);
      setConfirmAction(null);
      await fetchContainers();
    } catch {
      setError('强制签入失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceDestroy = async (checkoutId: string) => {
    setActionLoading(checkoutId);
    setSuccessMsg(null);
    try {
      await apiClient.post(`/containers/${checkoutId}/force-destroy`);
      setSuccessMsg('容器已强制销毁');
      setConfirmAction(null);
      setDestroyDoubleConfirm(false);
      await fetchContainers();
    } catch {
      setError('强制销毁失败');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDuration = (checkedOutAt: string | null): string => {
    if (!checkedOutAt) return '--';
    const start = new Date(checkedOutAt).getTime();
    const now = Date.now();
    const diffMs = now - start;
    const hours = Math.floor(diffMs / 3_600_000);
    const mins = Math.floor((diffMs % 3_600_000) / 60_000);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
        return '#a6e3a1';
      case 'stopped':
        return '#f38ba8';
      default:
        return '#f9e2af';
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>容器管理</h1>
        <button
          style={styles.refreshBtn}
          onClick={() => void fetchContainers()}
          disabled={loading}
        >
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={styles.errorBanner}>
          {error}
          <button
            style={styles.dismissBtn}
            onClick={() => setError(null)}
          >
            x
          </button>
        </div>
      )}
      {successMsg && (
        <div style={styles.successBanner}>
          {successMsg}
          <button
            style={styles.dismissBtn}
            onClick={() => setSuccessMsg(null)}
          >
            x
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && containers.length === 0 && (
        <div style={styles.loading}>加载中...</div>
      )}

      {/* Empty state */}
      {!loading && containers.length === 0 && (
        <div style={styles.empty}>当前没有活跃的容器</div>
      )}

      {/* Table */}
      {containers.length > 0 && (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>容器 ID</th>
                <th style={styles.th}>页面名称</th>
                <th style={styles.th}>签出者</th>
                <th style={styles.th}>签出时长</th>
                <th style={styles.th}>状态</th>
                <th style={styles.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((c) => (
                <tr key={c.checkoutId} style={styles.tr}>
                  <td style={styles.td}>
                    <span style={styles.mono}>
                      {c.containerId?.slice(0, 12) ?? '--'}
                    </span>
                  </td>
                  <td style={styles.td}>{c.pageName}</td>
                  <td style={styles.td}>
                    <span>{c.checkedOutBy?.displayName ?? '--'}</span>
                    {c.checkedOutBy?.username && (
                      <span style={styles.username}>
                        ({c.checkedOutBy.username})
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>{formatDuration(c.checkedOutAt)}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: getStatusColor(c.status),
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionRow}>
                      <button
                        style={styles.checkinBtn}
                        disabled={actionLoading === c.checkoutId}
                        onClick={() =>
                          setConfirmAction({
                            checkoutId: c.checkoutId,
                            type: 'checkin',
                          })
                        }
                      >
                        强制签入
                      </button>
                      <button
                        style={styles.destroyBtn}
                        disabled={actionLoading === c.checkoutId}
                        onClick={() => {
                          setConfirmAction({
                            checkoutId: c.checkoutId,
                            type: 'destroy',
                          });
                          setDestroyDoubleConfirm(false);
                        }}
                      >
                        强制销毁
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div style={styles.overlay} onClick={() => setConfirmAction(null)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            {confirmAction.type === 'checkin' ? (
              <>
                <h3 style={styles.dialogTitle}>确认强制签入</h3>
                <p style={styles.dialogText}>
                  将自动提交所有更改并销毁容器。是否继续？
                </p>
                <div style={styles.dialogActions}>
                  <button
                    style={styles.cancelBtn}
                    onClick={() => setConfirmAction(null)}
                  >
                    取消
                  </button>
                  <button
                    style={styles.confirmBtn}
                    disabled={actionLoading === confirmAction.checkoutId}
                    onClick={() =>
                      void handleForceCheckin(confirmAction.checkoutId)
                    }
                  >
                    {actionLoading === confirmAction.checkoutId
                      ? '处理中...'
                      : '确认签入'}
                  </button>
                </div>
              </>
            ) : !destroyDoubleConfirm ? (
              <>
                <h3 style={styles.dialogTitle}>确认强制销毁</h3>
                <p style={{ ...styles.dialogText, color: '#f38ba8' }}>
                  容器内所有未签入的改动永久丢失
                </p>
                <div style={styles.dialogActions}>
                  <button
                    style={styles.cancelBtn}
                    onClick={() => setConfirmAction(null)}
                  >
                    取消
                  </button>
                  <button
                    style={styles.dangerBtn}
                    onClick={() => setDestroyDoubleConfirm(true)}
                  >
                    我了解风险
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={styles.dialogTitle}>二次确认</h3>
                <p style={{ ...styles.dialogText, color: '#f38ba8', fontWeight: 600 }}>
                  此操作不可撤销，容器内所有未签入的改动将永久丢失。确认销毁？
                </p>
                <div style={styles.dialogActions}>
                  <button
                    style={styles.cancelBtn}
                    onClick={() => setConfirmAction(null)}
                  >
                    取消
                  </button>
                  <button
                    style={styles.dangerBtn}
                    disabled={actionLoading === confirmAction.checkoutId}
                    onClick={() =>
                      void handleForceDestroy(confirmAction.checkoutId)
                    }
                  >
                    {actionLoading === confirmAction.checkoutId
                      ? '处理中...'
                      : '确认销毁'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 24,
    maxWidth: 1400,
    margin: '0 auto',
    color: '#cdd6f4',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#cdd6f4',
    margin: 0,
  },
  refreshBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorBanner: {
    background: '#f38ba8',
    color: '#1e1e2e',
    padding: '8px 14px',
    borderRadius: 6,
    marginBottom: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 14,
  },
  successBanner: {
    background: '#a6e3a1',
    color: '#1e1e2e',
    padding: '8px 14px',
    borderRadius: 6,
    marginBottom: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 14,
  },
  dismissBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
    color: '#1e1e2e',
    fontWeight: 700,
  },
  loading: {
    textAlign: 'center' as const,
    padding: 40,
    color: '#6c7086',
  },
  empty: {
    textAlign: 'center' as const,
    padding: 60,
    color: '#6c7086',
    fontSize: 14,
  },
  tableWrapper: {
    overflowX: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 14,
  },
  th: {
    textAlign: 'left' as const,
    padding: '10px 12px',
    borderBottom: '2px solid #45475a',
    color: '#a6adc8',
    fontWeight: 600,
    fontSize: 13,
    whiteSpace: 'nowrap' as const,
  },
  tr: {
    borderBottom: '1px solid #313244',
  },
  td: {
    padding: '10px 12px',
    verticalAlign: 'middle' as const,
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#89b4fa',
  },
  username: {
    fontSize: 12,
    color: '#6c7086',
    marginLeft: 4,
  },
  statusBadge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    fontWeight: 600,
    color: '#1e1e2e',
  },
  actionRow: {
    display: 'flex',
    gap: 8,
  },
  checkinBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 4,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  destroyBtn: {
    background: 'transparent',
    color: '#f38ba8',
    border: '1px solid #f38ba8',
    borderRadius: 4,
    padding: '4px 12px',
    fontSize: 12,
    cursor: 'pointer',
  },
  // Dialog
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    background: '#1e1e2e',
    border: '1px solid #45475a',
    borderRadius: 12,
    padding: 24,
    width: 420,
    maxWidth: '90vw',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#cdd6f4',
    margin: '0 0 12px 0',
  },
  dialogText: {
    fontSize: 14,
    color: '#a6adc8',
    lineHeight: 1.5,
    margin: '0 0 20px 0',
  },
  dialogActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelBtn: {
    background: '#45475a',
    color: '#cdd6f4',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    cursor: 'pointer',
  },
  confirmBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  dangerBtn: {
    background: '#f38ba8',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default ContainerOpsPage;
