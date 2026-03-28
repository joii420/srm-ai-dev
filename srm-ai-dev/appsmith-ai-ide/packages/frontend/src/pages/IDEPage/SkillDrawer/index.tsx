import React, { useState, useEffect, useMemo } from 'react';
import { useSkillStore, type SkillInfo } from '../../../stores/skillStore';
import { apiClient } from '../../../services/api';

interface SkillDrawerProps {
  open: boolean;
  onClose: () => void;
  onQuickInvoke?: (prompt: string) => void;
  onFillAndInvoke?: (skill: SkillInfo) => void;
}

type TabKey = 'select' | 'quick';

const SkillDrawer: React.FC<SkillDrawerProps> = ({ open, onClose, onQuickInvoke, onFillAndInvoke }) => {
  const { skills, activatedSkillIds, setSkills, toggleSkill } = useSkillStore();
  const [activeTab, setActiveTab] = useState<TabKey>('select');
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Fetch skills when drawer opens
  useEffect(() => {
    if (open) {
      fetchSkills();
    }
  }, [open]);

  const fetchSkills = async () => {
    try {
      const res = await apiClient.get<SkillInfo[] | { skills: SkillInfo[] }>('/skills?enabled=true');
      const data = res.data;
      setSkills(Array.isArray(data) ? data : data.skills ?? []);
    } catch {
      // silent
    }
  };

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    (skills ?? []).forEach((s) => (s.tags ?? []).forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [skills]);

  // Filter and sort skills
  const filteredSkills = useMemo(() => {
    let list = [...(skills ?? [])];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description ?? '').toLowerCase().includes(q) ||
          (s.keywords ?? []).some((k) => k.toLowerCase().includes(q)),
      );
    }
    if (selectedTag) {
      list = list.filter((s) => (s.tags ?? []).includes(selectedTag));
    }
    // Already sorted by callCount desc from API, but ensure it
    list.sort((a, b) => b.callCount - a.callCount);
    return list;
  }, [skills, search, selectedTag]);


  // Activated skills for quick tab
  const activatedSkills = useMemo(
    () => (skills ?? []).filter((s) => activatedSkillIds.includes(s.id)),
    [skills, activatedSkillIds],
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Drawer */}
      <div style={styles.drawer}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerTitle}>Skills</span>
          <button style={styles.closeBtn} onClick={onClose}>
            x
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'select' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('select')}
          >
            选择 Skill
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'quick' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('quick')}
          >
            快速调用
          </button>
        </div>

        {/* Tab Content */}
        <div style={styles.body}>
          {activeTab === 'select' ? (
            <>
              {/* Search */}
              <input
                style={styles.searchInput}
                placeholder="搜索 Skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {/* Tag Filter Chips */}
              <div style={styles.tagRow}>
                <button
                  style={{
                    ...styles.tagChip,
                    ...(selectedTag === null ? styles.tagChipActive : {}),
                  }}
                  onClick={() => setSelectedTag(null)}
                >
                  全部
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    style={{
                      ...styles.tagChip,
                      ...(selectedTag === tag ? styles.tagChipActive : {}),
                    }}
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Skill List */}
              <div style={styles.skillList}>
                {filteredSkills.map((skill) => (
                  <label key={skill.id} style={styles.skillItem}>
                    <input
                      type="checkbox"
                      checked={activatedSkillIds.includes(skill.id)}
                      onChange={() => toggleSkill(skill.id)}
                      style={{ marginRight: 8 }}
                    />
                    <span style={styles.skillIcon}>{skill.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.skillName}>{skill.name}</div>
                      <div style={styles.skillDesc}>{skill.description}</div>
                      <div style={styles.skillMeta}>
                        {(skill.tags ?? []).map((t) => (
                          <span key={t} style={styles.miniTag}>
                            {t}
                          </span>
                        ))}
                        <span style={styles.callCount}>调用 {skill.callCount}</span>
                      </div>
                    </div>
                  </label>
                ))}
                {filteredSkills.length === 0 && (
                  <div style={{ color: '#6c7086', fontSize: 13, textAlign: 'center', padding: 20 }}>
                    无匹配的 Skill
                  </div>
                )}
              </div>

              {/* Selected count */}
              {activatedSkillIds.length > 0 && (
                <div style={{ color: '#a6adc8', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
                  已选择 {activatedSkillIds.length} 个 Skill
                </div>
              )}
            </>
          ) : (
            /* Quick tab - shows activated skills with invoke buttons */
            <div style={styles.skillList}>
              {activatedSkills.length === 0 && (
                <div style={{ color: '#6c7086', fontSize: 13, textAlign: 'center', padding: 20 }}>
                  未激活任何 Skill
                </div>
              )}
              {activatedSkills.map((skill) => {
                const hasFields = skill.fields && skill.fields.length > 0;
                return (
                  <div key={skill.id} style={styles.quickSkillItem}>
                    <span style={styles.skillIcon}>{skill.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.skillName}>{skill.name}</div>
                      <div style={styles.skillDesc}>{skill.description}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {hasFields ? (
                        <button
                          style={styles.invokeBtn}
                          onClick={() => {
                            if (onFillAndInvoke) {
                              onFillAndInvoke(skill);
                            }
                          }}
                          title="填写并触发"
                        >
                          填写并触发
                        </button>
                      ) : (
                        <button
                          style={styles.invokeBtn}
                          onClick={() => {
                            if (onQuickInvoke) {
                              onQuickInvoke(skill.prompt ?? skill.description ?? skill.name);
                              onClose();
                            }
                          }}
                          title="直接触发"
                        >
                          直接触发
                        </button>
                      )}
                      <button
                        style={styles.removeBtn}
                        onClick={() => toggleSkill(skill.id)}
                        title="移除"
                      >
                        x
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 380,
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
    padding: '2px 6px',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #313244',
  },
  tab: {
    flex: 1,
    padding: '8px 0',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#6c7086',
    fontSize: 13,
    cursor: 'pointer',
  },
  tabActive: {
    color: '#89b4fa',
    borderBottom: '2px solid #89b4fa',
  },
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '12px 16px',
    gap: 10,
  },
  searchInput: {
    background: '#313244',
    border: '1px solid #45475a',
    borderRadius: 6,
    color: '#cdd6f4',
    fontSize: 13,
    padding: '8px 10px',
    outline: 'none',
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    background: '#313244',
    border: '1px solid #45475a',
    borderRadius: 12,
    color: '#a6adc8',
    fontSize: 11,
    padding: '3px 10px',
    cursor: 'pointer',
  },
  tagChipActive: {
    background: '#89b4fa',
    color: '#1e1e2e',
    borderColor: '#89b4fa',
  },
  skillList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  skillItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 10px',
    background: '#313244',
    borderRadius: 6,
    cursor: 'pointer',
    border: 'none',
    fontSize: 13,
    color: '#cdd6f4',
  },
  quickSkillItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    background: '#313244',
    borderRadius: 6,
  },
  skillIcon: {
    fontSize: 18,
    lineHeight: 1,
    flexShrink: 0,
  },
  skillName: {
    color: '#cdd6f4',
    fontSize: 13,
    fontWeight: 600,
  },
  skillDesc: {
    color: '#a6adc8',
    fontSize: 12,
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  skillMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  miniTag: {
    background: '#45475a',
    color: '#a6adc8',
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 8,
  },
  callCount: {
    color: '#6c7086',
    fontSize: 10,
  },
  confirmBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
    flexShrink: 0,
  },
  invokeBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#f38ba8',
    fontSize: 14,
    cursor: 'pointer',
    padding: '2px 6px',
  },
};

export default SkillDrawer;
