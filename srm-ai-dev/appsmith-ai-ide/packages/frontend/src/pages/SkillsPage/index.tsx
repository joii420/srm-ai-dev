import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSkillStore, type SkillInfo } from '../../stores/skillStore';
import { apiClient } from '../../services/api';
import SkillEditDrawer from './SkillEditDrawer';
import SkillVersionPanel from './SkillVersionPanel';

const SkillsPage: React.FC = () => {
  const { skills, setSkills, loading, setLoading } = useSkillStore();
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [versionSkillId, setVersionSkillId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState(false);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<SkillInfo[]>('/skills');
      setSkills(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [setSkills, setLoading]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const enabledSkills = useMemo(
    () => skills.filter((s) => s.enabled).sort((a, b) => b.callCount - a.callCount),
    [skills],
  );

  const disabledSkills = useMemo(
    () => skills.filter((s) => !s.enabled).sort((a, b) => b.callCount - a.callCount),
    [skills],
  );

  const handleToggle = async (skill: SkillInfo) => {
    try {
      await apiClient.put(`/skills/${skill.id}`, { enabled: !skill.enabled });
      await fetchSkills();
    } catch {
      // silent
    }
  };

  const editingSkill = editingSkillId ? skills.find((s) => s.id === editingSkillId) ?? null : null;

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>Skills 管理</h1>
        <button
          style={styles.createBtn}
          onClick={() => {
            setCreateMode(true);
            setEditingSkillId(null);
          }}
        >
          新建 Skill
        </button>
      </div>

      {loading && <div style={styles.loading}>加载中...</div>}

      {/* Enabled Skills */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>已启用 ({enabledSkills.length})</h2>
        <div style={styles.grid}>
          {enabledSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onToggle={() => handleToggle(skill)}
              onEdit={() => {
                setCreateMode(false);
                setEditingSkillId(skill.id);
              }}
              onVersions={() => setVersionSkillId(skill.id)}
            />
          ))}
          {enabledSkills.length === 0 && !loading && (
            <div style={styles.empty}>暂无已启用的 Skill</div>
          )}
        </div>
      </section>

      {/* Available (disabled) Skills */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>可用 ({disabledSkills.length})</h2>
        <div style={styles.grid}>
          {disabledSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onToggle={() => handleToggle(skill)}
              onEdit={() => {
                setCreateMode(false);
                setEditingSkillId(skill.id);
              }}
              onVersions={() => setVersionSkillId(skill.id)}
            />
          ))}
          {disabledSkills.length === 0 && !loading && (
            <div style={styles.empty}>暂无可用的 Skill</div>
          )}
        </div>
      </section>

      {/* Edit Drawer */}
      <SkillEditDrawer
        open={editingSkillId !== null || createMode}
        skill={createMode ? null : editingSkill}
        onClose={() => {
          setEditingSkillId(null);
          setCreateMode(false);
        }}
        onSaved={() => {
          setEditingSkillId(null);
          setCreateMode(false);
          fetchSkills();
        }}
      />

      {/* Version Panel */}
      {versionSkillId && (
        <SkillVersionPanel
          skillId={versionSkillId}
          onClose={() => setVersionSkillId(null)}
          onRollback={() => {
            setVersionSkillId(null);
            fetchSkills();
          }}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Skill Card                                                         */
/* ------------------------------------------------------------------ */

interface SkillCardProps {
  skill: SkillInfo;
  onToggle: () => void;
  onEdit: () => void;
  onVersions: () => void;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, onToggle, onEdit, onVersions }) => {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardIcon}>{skill.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.cardName}>{skill.name}</div>
          <div style={styles.cardDesc}>{skill.description}</div>
        </div>
        <label style={styles.toggle}>
          <input
            type="checkbox"
            checked={skill.enabled}
            onChange={onToggle}
            style={{ display: 'none' }}
          />
          <span
            style={{
              ...styles.toggleTrack,
              background: skill.enabled ? '#89b4fa' : '#45475a',
            }}
          >
            <span
              style={{
                ...styles.toggleThumb,
                transform: skill.enabled ? 'translateX(16px)' : 'translateX(0)',
              }}
            />
          </span>
        </label>
      </div>
      <div style={styles.cardMeta}>
        {(skill.tags ?? []).map((t) => (
          <span key={t} style={styles.cardTag}>
            {t}
          </span>
        ))}
        <span style={styles.cardStat}>v{(skill.version ?? '').replace(/^v/, '')}</span>
        <span style={styles.cardStat}>调用 {skill.callCount}</span>
      </div>
      <div style={styles.cardActions}>
        <button style={styles.cardBtn} onClick={onEdit}>
          编辑
        </button>
        <button style={styles.cardBtn} onClick={onVersions}>
          版本
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px 32px',
    background: '#1e1e2e',
    minHeight: '100vh',
    color: '#cdd6f4',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },
  createBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    padding: '8px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  loading: {
    color: '#6c7086',
    fontSize: 13,
    marginBottom: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#a6adc8',
    marginBottom: 12,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 12,
  },
  empty: {
    color: '#6c7086',
    fontSize: 13,
    padding: 16,
  },
  card: {
    background: '#313244',
    borderRadius: 8,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardIcon: {
    fontSize: 24,
    lineHeight: 1,
    flexShrink: 0,
  },
  cardName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#cdd6f4',
  },
  cardDesc: {
    fontSize: 12,
    color: '#a6adc8',
    marginTop: 2,
  },
  toggle: {
    cursor: 'pointer',
    flexShrink: 0,
  },
  toggleTrack: {
    display: 'inline-block',
    width: 36,
    height: 20,
    borderRadius: 10,
    position: 'relative',
    transition: 'background 0.2s',
  },
  toggleThumb: {
    display: 'block',
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute',
    top: 2,
    left: 2,
    transition: 'transform 0.2s',
  },
  cardMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  cardTag: {
    background: '#45475a',
    color: '#a6adc8',
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 8,
  },
  cardStat: {
    color: '#6c7086',
    fontSize: 10,
  },
  cardActions: {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  },
  cardBtn: {
    background: '#45475a',
    border: '1px solid #585b70',
    borderRadius: 4,
    color: '#cdd6f4',
    fontSize: 12,
    padding: '4px 12px',
    cursor: 'pointer',
  },
};

export default SkillsPage;
