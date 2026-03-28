import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../services/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Dependency {
  id: string;
  namespace: string;
  url: string;
  version: string | null;
  description: string | null;
  lastLoaded: string | null;
}

interface CreateDepPayload {
  namespace: string;
  url: string;
  version?: string;
  description?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const DepsPage: React.FC = () => {
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formNamespace, setFormNamespace] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formVersion, setFormVersion] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');

  const fetchDeps = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<Dependency[]>('/deps');
      setDeps(res.data);
    } catch {
      console.error('Failed to fetch dependencies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDeps();
  }, [fetchDeps]);

  const handleCreate = async () => {
    if (!formNamespace.trim() || !formUrl.trim()) {
      setFormError('命名空间和 URL 为必填项');
      return;
    }

    const payload: CreateDepPayload = {
      namespace: formNamespace.trim(),
      url: formUrl.trim(),
    };
    if (formVersion.trim()) payload.version = formVersion.trim();
    if (formDescription.trim()) payload.description = formDescription.trim();

    try {
      await apiClient.post('/deps', payload);
      setShowModal(false);
      resetForm();
      await fetchDeps();
    } catch {
      setFormError('创建失败，请检查输入');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/deps/${id}`);
      setDeleteConfirmId(null);
      await fetchDeps();
    } catch {
      console.error('Failed to delete dependency');
    }
  };

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    try {
      await apiClient.post(`/deps/${id}/refresh`);
      await fetchDeps();
    } catch {
      console.error('Failed to refresh dependency');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshingAll(true);
    try {
      await apiClient.post('/deps/batch/refresh');
      await fetchDeps();
    } catch {
      console.error('Failed to refresh all dependencies');
    } finally {
      setRefreshingAll(false);
    }
  };

  const resetForm = () => {
    setFormNamespace('');
    setFormUrl('');
    setFormVersion('');
    setFormDescription('');
    setFormError('');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>依赖库管理</h1>
        <div style={styles.headerActions}>
          <button
            style={styles.refreshAllBtn}
            onClick={handleRefreshAll}
            disabled={refreshingAll}
          >
            {refreshingAll ? '更新中...' : '全部更新'}
          </button>
          <button
            style={styles.addBtn}
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            添加依赖库
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && <div style={styles.loading}>加载中...</div>}

      {/* Empty state */}
      {!loading && deps.length === 0 && (
        <div style={styles.empty}>暂无依赖库，点击"添加依赖库"开始</div>
      )}

      {/* Card Grid */}
      <div style={styles.grid}>
        {deps.map((dep) => (
          <div key={dep.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.namespace}>{dep.namespace}</span>
              {dep.version && (
                <span style={styles.version}>{dep.version}</span>
              )}
            </div>
            {dep.description && (
              <p style={styles.description}>{dep.description}</p>
            )}
            <div style={styles.cardMeta}>
              <span style={styles.metaLabel}>URL:</span>
              <span style={styles.metaValue}>{dep.url}</span>
            </div>
            <div style={styles.cardMeta}>
              <span style={styles.metaLabel}>最后加载:</span>
              <span style={styles.metaValue}>{formatDate(dep.lastLoaded)}</span>
            </div>
            <div style={styles.cardMeta}>
              <span style={styles.metaLabel}>状态:</span>
              <span
                style={{
                  ...styles.statusBadge,
                  background: dep.lastLoaded ? '#a6e3a1' : '#f9e2af',
                  color: '#1e1e2e',
                }}
              >
                {dep.lastLoaded ? '已加载' : '未加载'}
              </span>
            </div>
            <div style={styles.cardActions}>
              <button
                style={styles.updateBtn}
                onClick={() => handleRefresh(dep.id)}
                disabled={refreshingId === dep.id}
              >
                {refreshingId === dep.id ? '更新中...' : '更新'}
              </button>
              {deleteConfirmId === dep.id ? (
                <div style={styles.confirmRow}>
                  <span style={{ color: '#f38ba8', fontSize: 12 }}>确认删除?</span>
                  <button
                    style={styles.confirmYes}
                    onClick={() => handleDelete(dep.id)}
                  >
                    是
                  </button>
                  <button
                    style={styles.confirmNo}
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    否
                  </button>
                </div>
              ) : (
                <button
                  style={styles.deleteBtn}
                  onClick={() => setDeleteConfirmId(dep.id)}
                >
                  删除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>添加依赖库</h2>
            {formError && <div style={styles.formError}>{formError}</div>}
            <div style={styles.formGroup}>
              <label style={styles.label}>命名空间 *</label>
              <input
                style={styles.input}
                value={formNamespace}
                onChange={(e) => setFormNamespace(e.target.value)}
                placeholder="如: appsmith-utils"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>URL *</label>
              <input
                style={styles.input}
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="如: https://example.com/utils.js"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>版本</label>
              <input
                style={styles.input}
                value={formVersion}
                onChange={(e) => setFormVersion(e.target.value)}
                placeholder="如: v1.0"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>描述</label>
              <textarea
                style={{ ...styles.input, minHeight: 60, resize: 'vertical' as const }}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="依赖库的说明..."
              />
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>
                取消
              </button>
              <button style={styles.submitBtn} onClick={handleCreate}>
                创建
              </button>
            </div>
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
    maxWidth: 1200,
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
  headerActions: {
    display: 'flex',
    gap: 12,
  },
  addBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  refreshAllBtn: {
    background: '#a6e3a1',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#313244',
    borderRadius: 8,
    padding: 16,
    border: '1px solid #45475a',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  namespace: {
    fontSize: 16,
    fontWeight: 600,
    color: '#89b4fa',
  },
  version: {
    fontSize: 12,
    color: '#a6adc8',
    background: '#45475a',
    padding: '2px 6px',
    borderRadius: 4,
  },
  description: {
    fontSize: 13,
    color: '#a6adc8',
    margin: '0 0 8px 0',
    lineHeight: 1.4,
  },
  cardMeta: {
    display: 'flex',
    gap: 6,
    fontSize: 12,
    marginBottom: 4,
  },
  metaLabel: {
    color: '#6c7086',
    flexShrink: 0,
  },
  metaValue: {
    color: '#a6adc8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  statusBadge: {
    fontSize: 11,
    padding: '1px 6px',
    borderRadius: 4,
    fontWeight: 600,
  },
  cardActions: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  updateBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 4,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteBtn: {
    background: 'transparent',
    color: '#f38ba8',
    border: '1px solid #f38ba8',
    borderRadius: 4,
    padding: '4px 12px',
    fontSize: 12,
    cursor: 'pointer',
  },
  confirmRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  confirmYes: {
    background: '#f38ba8',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmNo: {
    background: '#45475a',
    color: '#cdd6f4',
    border: 'none',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
    cursor: 'pointer',
  },
  // Modal
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#1e1e2e',
    border: '1px solid #45475a',
    borderRadius: 12,
    padding: 24,
    width: 440,
    maxWidth: '90vw',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#cdd6f4',
    margin: '0 0 16px 0',
  },
  formError: {
    background: '#f38ba8',
    color: '#1e1e2e',
    padding: '6px 10px',
    borderRadius: 4,
    fontSize: 13,
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    display: 'block',
    fontSize: 13,
    color: '#a6adc8',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    background: '#313244',
    border: '1px solid #45475a',
    borderRadius: 6,
    color: '#cdd6f4',
    fontSize: 13,
    padding: '8px 10px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
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
  submitBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default DepsPage;
