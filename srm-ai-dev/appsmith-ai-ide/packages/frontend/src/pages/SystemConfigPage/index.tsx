import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../services/api';

interface DatasourceOption {
  text: string;
  value: string;
}

interface ConfigEntry {
  key: string;
  name: string | null;
  value: unknown;
  description: string | null;
  type: string;
  datasource: DatasourceOption[] | null;
}

const SystemConfigPage: React.FC = () => {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  /** Strip surrounding quotes from JSONB string values */
  const unwrapValue = (val: unknown): string => {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    const s = JSON.stringify(val);
    // JSONB stores strings as "xxx", JSON.stringify produces "\"xxx\"" — unwrap
    if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
    return s;
  };

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<ConfigEntry[]>('/system-config');
      setConfigs(res.data);
      const values: Record<string, string> = {};
      for (const c of res.data) {
        values[c.key] = unwrapValue(c.value);
      }
      setEditValues(values);
      setOriginalValues({ ...values });
    } catch {
      console.error('Failed to fetch system config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchConfigs(); }, [fetchConfigs]);

  const setVal = (key: string, val: string) => {
    setEditValues((prev) => ({ ...prev, [key]: val }));
    setSaveMsg(null);
  };

  /** Find keys that have been changed */
  const changedKeys = Object.keys(editValues).filter(
    (k) => editValues[k] !== originalValues[k],
  );

  const handleSaveAll = async () => {
    if (changedKeys.length === 0) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      for (const key of changedKeys) {
        await apiClient.put('/system-config', { key, value: editValues[key] });
      }
      setSaveMsg({ ok: true, text: `已保存 ${changedKeys.length} 项配置` });
      await fetchConfigs();
    } catch {
      setSaveMsg({ ok: false, text: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={S.page}><p style={{ color: '#6c7086', textAlign: 'center', padding: 40 }}>加载中...</p></div>;
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>系统配置</h1>
        <div style={S.headerRight}>
          {saveMsg && (
            <span style={{ fontSize: 13, color: saveMsg.ok ? '#a6e3a1' : '#f38ba8' }}>
              {saveMsg.text}
            </span>
          )}
          <button
            style={{
              ...S.saveBtn,
              opacity: changedKeys.length === 0 || saving ? 0.5 : 1,
              cursor: changedKeys.length === 0 || saving ? 'default' : 'pointer',
            }}
            onClick={handleSaveAll}
            disabled={changedKeys.length === 0 || saving}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div style={S.form}>
        {configs.map((c) => {
          const changed = editValues[c.key] !== originalValues[c.key];
          return (
            <div key={c.key} style={{ ...S.row, ...(changed ? S.rowChanged : {}) }}>
              <div style={S.labelCol}>
                <label style={S.label}>{c.name || c.key}</label>
                {c.description && <span style={S.desc}>{c.description}</span>}
              </div>
              <div style={S.valueCol}>
                {c.type === 'dropdown' && c.datasource ? (
                  <select
                    style={S.input}
                    value={editValues[c.key] ?? ''}
                    onChange={(e) => setVal(c.key, e.target.value)}
                  >
                    <option value="">-- 请选择 --</option>
                    {c.datasource.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.text}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    style={S.input}
                    value={editValues[c.key] ?? ''}
                    onChange={(e) => setVal(c.key, e.target.value)}
                    placeholder={c.description || ''}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  page: {
    padding: 24,
    maxWidth: 1100,
    margin: '0 auto',
    color: '#cdd6f4',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },
  form: {
    background: '#313244',
    border: '1px solid #45475a',
    borderRadius: 8,
    padding: '4px 0',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 24px',
    borderBottom: '1px solid rgba(69,71,90,0.4)',
    gap: 24,
  },
  rowChanged: {
    background: 'rgba(137,180,250,0.06)',
  },
  labelCol: {
    width: 160,
    flexShrink: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: '#cdd6f4',
    display: 'block',
  },
  desc: {
    fontSize: 11,
    color: '#6c7086',
    display: 'block',
    marginTop: 2,
  },
  valueCol: {
    flex: 1,
  },
  input: {
    width: '100%',
    background: '#1e1e2e',
    border: '1px solid #45475a',
    borderRadius: 6,
    color: '#cdd6f4',
    fontSize: 13,
    padding: '8px 12px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'monospace',
  },
  saveBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    padding: '8px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default SystemConfigPage;
