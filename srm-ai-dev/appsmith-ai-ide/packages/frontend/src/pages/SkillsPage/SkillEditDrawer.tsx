import React, { useState, useEffect, useCallback } from 'react';
import type { SkillInfo, SkillField } from '../../stores/skillStore';
import { apiClient } from '../../services/api';

interface SkillEditDrawerProps {
  open: boolean;
  skill: SkillInfo | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}

type TabKey = 'prompt' | 'fields';

interface EditableField {
  _key: string; // internal key for react
  fieldId: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string;
  options: string[];
  token: string;
}

function toEditableField(f: SkillField): EditableField {
  return {
    _key: f.id || `f-${Math.random().toString(36).slice(2, 8)}`,
    fieldId: f.id,
    label: f.label,
    type: f.type,
    required: f.required,
    placeholder: f.placeholder ?? '',
    options: f.options ?? [],
    token: f.token ?? '',
  };
}

function newEditableField(): EditableField {
  const key = `f-${Math.random().toString(36).slice(2, 8)}`;
  return {
    _key: key,
    fieldId: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    options: [],
    token: '',
  };
}

/**
 * Highlight {{placeholder}} tokens in prompt text.
 * Returns an array of React nodes.
 */
function highlightPrompt(text: string): React.ReactNode[] {
  const parts = text.split(/({{[^}]+}})/g);
  return parts.map((part, i) => {
    if (/^{{[^}]+}}$/.test(part)) {
      return (
        <span key={i} style={{ color: '#f9e2af', fontWeight: 600 }}>
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const SkillEditDrawer: React.FC<SkillEditDrawerProps> = ({ open, skill, onClose, onSaved }) => {
  const isCreate = skill === null;
  const [activeTab, setActiveTab] = useState<TabKey>('prompt');
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [category, setCategory] = useState('');
  const [prompt, setPrompt] = useState('');
  const [tags, setTags] = useState('');
  const [keywords, setKeywords] = useState('');
  const [fields, setFields] = useState<EditableField[]>([]);

  // Reset form when skill changes
  useEffect(() => {
    if (!open) return;
    if (skill) {
      setName(skill.name);
      setDescription(skill.description ?? '');
      setIcon(skill.icon ?? '');
      setCategory(skill.category ?? '');
      setPrompt(skill.prompt ?? '');
      setTags((skill.tags ?? []).join(', '));
      setKeywords((skill.keywords ?? []).join(', '));
      setFields((skill.fields ?? []).map(toEditableField));
    } else {
      setName('');
      setDescription('');
      setIcon('');
      setCategory('');
      setPrompt('');
      setTags('');
      setKeywords('');
      setFields([]);
    }
    setActiveTab('prompt');
  }, [open, skill]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        icon: icon || undefined,
        category: category || undefined,
        prompt,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        keywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        fields: fields.map((f) => ({
          fieldId: f.fieldId,
          label: f.label,
          type: f.type,
          required: f.required,
          placeholder: f.placeholder || undefined,
          options: f.options,
          token: f.token,
        })),
      };

      if (isCreate) {
        await apiClient.post('/skills', payload);
      } else {
        await apiClient.put(`/skills/${skill!.id}`, payload);
      }
      onSaved();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [isCreate, skill, name, description, icon, category, prompt, tags, keywords, fields, onSaved]);

  // Field CRUD
  const addField = () => setFields((prev) => [...prev, newEditableField()]);
  const removeField = (key: string) => setFields((prev) => prev.filter((f) => f._key !== key));
  const updateField = (key: string, patch: Partial<EditableField>) => {
    setFields((prev) =>
      prev.map((f) => (f._key === key ? { ...f, ...patch } : f)),
    );
  };

  if (!open) return null;

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.drawer}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerTitle}>
            {isCreate ? '新建 Skill' : `编辑: ${skill!.name}`}
          </span>
          <button style={styles.closeBtn} onClick={onClose}>
            x
          </button>
        </div>

        {/* Basic info row (always visible) */}
        <div style={styles.basicInfo}>
          <input
            style={styles.input}
            placeholder="名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            style={{ ...styles.input, width: 60 }}
            placeholder="Icon"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
          />
          <input
            style={styles.input}
            placeholder="分类"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div style={styles.basicInfo}>
          <input
            style={{ ...styles.input, flex: 1 }}
            placeholder="描述"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div style={styles.basicInfo}>
          <input
            style={{ ...styles.input, flex: 1 }}
            placeholder="标签 (逗号分隔)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <input
            style={{ ...styles.input, flex: 1 }}
            placeholder="关键词 (逗号分隔)"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'prompt' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('prompt')}
          >
            系统 Prompt
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'fields' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('fields')}
          >
            模板参数
          </button>
        </div>

        {/* Tab content */}
        <div style={styles.body}>
          {activeTab === 'prompt' ? (
            <div style={styles.promptTab}>
              <div style={styles.promptPreview}>
                {highlightPrompt(prompt)}
              </div>
              <textarea
                style={styles.promptTextarea}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入系统 Prompt... 使用 {{placeholder}} 表示变量"
                rows={12}
              />
            </div>
          ) : (
            <div style={styles.fieldsTab}>
              {fields.map((field) => (
                <div key={field._key} style={styles.fieldRow}>
                  <div style={styles.fieldRowTop}>
                    <input
                      style={{ ...styles.fieldInput, width: 100 }}
                      placeholder="fieldId"
                      value={field.fieldId}
                      onChange={(e) => updateField(field._key, { fieldId: e.target.value })}
                    />
                    <input
                      style={{ ...styles.fieldInput, flex: 1 }}
                      placeholder="标签"
                      value={field.label}
                      onChange={(e) => updateField(field._key, { label: e.target.value })}
                    />
                    <select
                      style={styles.fieldSelect}
                      value={field.type}
                      onChange={(e) => updateField(field._key, { type: e.target.value })}
                    >
                      <option value="text">text</option>
                      <option value="textarea">textarea</option>
                      <option value="select">select</option>
                      <option value="number">number</option>
                    </select>
                    <label style={{ color: '#a6adc8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(field._key, { required: e.target.checked })}
                      />
                      必填
                    </label>
                    <button style={styles.removeFieldBtn} onClick={() => removeField(field._key)}>
                      x
                    </button>
                  </div>
                  <div style={styles.fieldRowBottom}>
                    <input
                      style={{ ...styles.fieldInput, flex: 1 }}
                      placeholder="placeholder"
                      value={field.placeholder}
                      onChange={(e) => updateField(field._key, { placeholder: e.target.value })}
                    />
                    <input
                      style={{ ...styles.fieldInput, flex: 1 }}
                      placeholder="options (逗号分隔)"
                      value={field.options.join(', ')}
                      onChange={(e) =>
                        updateField(field._key, {
                          options: e.target.value
                            .split(',')
                            .map((o) => o.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                    <input
                      style={{ ...styles.fieldInput, width: 120 }}
                      placeholder="token"
                      value={field.token}
                      onChange={(e) => updateField(field._key, { token: e.target.value })}
                    />
                  </div>
                </div>
              ))}
              <button style={styles.addFieldBtn} onClick={addField}>
                + 添加参数
              </button>
            </div>
          )}
        </div>

        {/* Save */}
        <div style={styles.footer}>
          <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
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
    width: 520,
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
  basicInfo: {
    display: 'flex',
    gap: 8,
    padding: '8px 16px 0',
  },
  input: {
    background: '#313244',
    border: '1px solid #45475a',
    borderRadius: 4,
    color: '#cdd6f4',
    fontSize: 13,
    padding: '6px 8px',
    outline: 'none',
    flex: 1,
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #313244',
    marginTop: 8,
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
    borderBottomColor: '#89b4fa',
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: 16,
  },
  promptTab: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  promptPreview: {
    background: '#313244',
    borderRadius: 6,
    padding: '10px 12px',
    fontSize: 13,
    color: '#cdd6f4',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    minHeight: 40,
    border: '1px solid #45475a',
  },
  promptTextarea: {
    background: '#313244',
    border: '1px solid #45475a',
    borderRadius: 6,
    color: '#cdd6f4',
    fontSize: 13,
    padding: '10px 12px',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'monospace',
    lineHeight: 1.6,
    minHeight: 200,
  },
  fieldsTab: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  fieldRow: {
    background: '#313244',
    borderRadius: 6,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldRowTop: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
  fieldRowBottom: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
  fieldInput: {
    background: '#45475a',
    border: '1px solid #585b70',
    borderRadius: 4,
    color: '#cdd6f4',
    fontSize: 12,
    padding: '4px 6px',
    outline: 'none',
  },
  fieldSelect: {
    background: '#45475a',
    border: '1px solid #585b70',
    borderRadius: 4,
    color: '#cdd6f4',
    fontSize: 12,
    padding: '4px 6px',
    outline: 'none',
  },
  removeFieldBtn: {
    background: 'none',
    border: 'none',
    color: '#f38ba8',
    fontSize: 14,
    cursor: 'pointer',
    padding: '2px 6px',
  },
  addFieldBtn: {
    background: '#45475a',
    border: '1px solid #585b70',
    borderRadius: 4,
    color: '#89b4fa',
    fontSize: 12,
    padding: '6px 12px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  footer: {
    padding: '12px 16px',
    borderTop: '1px solid #313244',
  },
  saveBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
};

export default SkillEditDrawer;
