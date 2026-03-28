import React, { useState, useEffect, useCallback } from 'react';
import type { SkillVersion } from '../../stores/skillStore';
import { apiClient } from '../../services/api';

interface SkillVersionPanelProps {
  skillId: string;
  onClose: () => void;
  onRollback: () => void;
}

const SkillVersionPanel: React.FC<SkillVersionPanelProps> = ({ skillId, onClose, onRollback }) => {
  const [versions, setVersions] = useState<SkillVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<SkillVersion[]>(`/skills/${skillId}/versions`);
      setVersions(Array.isArray(res.data) ? res.data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [skillId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleCreateVersion = async () => {
    setCreating(true);
    try {
      await apiClient.post(`/skills/${skillId}/versions`);
      await fetchVersions();
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  const handleRollback = async (versionId: string) => {
    try {
      await apiClient.post(`/skills/${skillId}/rollback`, { versionId });
      onRollback();
    } catch {
      // silent
    }
  };

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerTitle}>版本历史</span>
          <button style={styles.closeBtn} onClick={onClose}>
            x
          </button>
        </div>

        {/* Create version button */}
        <div style={styles.createRow}>
          <button style={styles.createBtn} onClick={handleCreateVersion} disabled={creating}>
            {creating ? '创建中...' : '创建新版本'}
          </button>
        </div>

        {/* Version list */}
        <div style={styles.body}>
          {loading && <div style={styles.loading}>加载中...</div>}
          {!loading && versions.length === 0 && (
            <div style={styles.empty}>暂无版本记录</div>
          )}
          {versions.map((ver) => (
            <div key={ver.id} style={styles.versionRow}>
              <div style={styles.versionInfo}>
                <span style={styles.versionLabel}>{ver.version}</span>
                <span style={styles.versionDate}>
                  {new Date(ver.createdAt).toLocaleString('zh-CN')}
                </span>
                {ver.modifiedBy && (
                  <span style={styles.versionModifier}>
                    {ver.modifiedBy.displayName ?? ver.modifiedBy.username}
                  </span>
                )}
              </div>
              <button
                style={styles.rollbackBtn}
                onClick={() => handleRollback(ver.id)}
              >
                回滚
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 999,
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 400,
    background: '#1e1e2e',
    borderLeft: '1px solid #313244',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #313244',
  },
  headerTitle: {
    color: '#cdd6f4',
    fontSize: 15,
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#6c7086',
    fontSize: 16,
    cursor: 'pointer',
  },
  createRow: {
    padding: '12px 16px',
    borderBottom: '1px solid #313244',
  },
  createBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  loading: {
    color: '#6c7086',
    fontSize: 13,
  },
  empty: {
    color: '#6c7086',
    fontSize: 13,
    textAlign: 'center',
    padding: 20,
  },
  versionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#313244',
    borderRadius: 6,
    padding: '10px 12px',
  },
  versionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  versionLabel: {
    color: '#cdd6f4',
    fontSize: 14,
    fontWeight: 600,
  },
  versionDate: {
    color: '#a6adc8',
    fontSize: 11,
  },
  versionModifier: {
    color: '#6c7086',
    fontSize: 11,
  },
  rollbackBtn: {
    background: '#f38ba8',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 4,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
};

export default SkillVersionPanel;
