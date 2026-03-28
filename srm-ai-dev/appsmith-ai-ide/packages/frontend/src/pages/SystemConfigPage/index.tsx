import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../services/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ConfigEntry {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const SystemConfigPage: React.FC = () => {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [sshTestResult, setSshTestResult] = useState<string | null>(null);
  const [sshTesting, setSshTesting] = useState(false);

  // SSH key form
  const [sshPrivateKey, setSshPrivateKey] = useState('');
  const [sshGitlabDomain, setSshGitlabDomain] = useState('');
  const [sshSaving, setSshSaving] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<ConfigEntry[]>('/system-config');
      setConfigs(res.data);

      // Initialize edit values
      const values: Record<string, string> = {};
      for (const c of res.data) {
        values[c.key] = typeof c.value === 'string' ? c.value : JSON.stringify(c.value, null, 2);
      }
      setEditValues(values);

      // Pre-fill gitlab domain if available
      const gitDomain = res.data.find((c) => c.key === 'git.gitlabDomain');
      if (gitDomain && typeof gitDomain.value === 'string') {
        setSshGitlabDomain(gitDomain.value);
      }
    } catch {
      console.error('Failed to fetch system config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfigs();
  }, [fetchConfigs]);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      let value: unknown;
      const raw = editValues[key] ?? '';
      try {
        value = JSON.parse(raw);
      } catch {
        value = raw;
      }
      await apiClient.put('/system-config', { key, value });
      await fetchConfigs();
    } catch {
      console.error(`Failed to save config: ${key}`);
    } finally {
      setSaving(null);
    }
  };

  const handleSshKeySave = async () => {
    if (!sshPrivateKey.trim() || !sshGitlabDomain.trim()) return;
    setSshSaving(true);
    try {
      await apiClient.put('/system-config/ssh-key', {
        privateKey: sshPrivateKey,
        gitlabDomain: sshGitlabDomain,
      });
      setSshPrivateKey('');
      setSshTestResult(null);
      await fetchConfigs();
    } catch {
      console.error('Failed to save SSH key');
    } finally {
      setSshSaving(false);
    }
  };

  const handleSshTest = async () => {
    setSshTesting(true);
    setSshTestResult(null);
    try {
      const res = await apiClient.post<{ success: boolean; message: string }>(
        '/system-config/ssh-test',
      );
      setSshTestResult(
        res.data.success ? `成功: ${res.data.message}` : `失败: ${res.data.message}`,
      );
    } catch {
      setSshTestResult('测试失败: 无法连接到服务器');
    } finally {
      setSshTesting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        setSshPrivateKey(content);
      }
    };
    reader.readAsText(file);
  };

  const getEditValue = (key: string) => editValues[key] ?? '';

  const setEditValue = (key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  /* ---------------------------------------------------------------- */
  /*  Grouped configs                                                  */
  /* ---------------------------------------------------------------- */

  const containerKeys = [
    'container.memoryLimit',
    'container.cpuLimit',
    'container.maxConcurrent',
    'container.healthCheckTimeout',
  ];
  const claudeKeys = [
    'claude.disabledTools',
    'claude.allowedPaths',
    'claude.deniedPaths',
  ];
  const jwtKeys = ['auth.jwtExpiresIn'];
  const otherKeys = configs
    .map((c) => c.key)
    .filter(
      (k) =>
        !containerKeys.includes(k) &&
        !claudeKeys.includes(k) &&
        !jwtKeys.includes(k) &&
        k !== 'git.sshKey' &&
        k !== 'git.gitlabDomain',
    );

  const renderConfigField = (key: string) => {
    const config = configs.find((c) => c.key === key);
    if (!config) return null;

    return (
      <div key={key} style={styles.field}>
        <div style={styles.fieldHeader}>
          <label style={styles.fieldLabel}>{key}</label>
          {config.description && (
            <span style={styles.fieldDesc}>{config.description}</span>
          )}
        </div>
        <div style={styles.fieldRow}>
          <textarea
            style={styles.textarea}
            value={getEditValue(key)}
            onChange={(e) => setEditValue(key, e.target.value)}
            rows={typeof config.value === 'object' ? 3 : 1}
          />
          <button
            style={styles.saveBtn}
            onClick={() => handleSave(key)}
            disabled={saving === key}
          >
            {saving === key ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>系统配置</h1>

      {/* Container Resources */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>容器资源</h2>
        {containerKeys.map(renderConfigField)}
      </section>

      {/* Claude Tools */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Claude 工具配置</h2>
        {claudeKeys.map(renderConfigField)}
      </section>

      {/* SSH Key */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>SSH 密钥</h2>
        <div style={styles.field}>
          <div style={styles.fieldHeader}>
            <label style={styles.fieldLabel}>私钥文件</label>
            <span style={styles.fieldDesc}>上传 SSH 私钥文件用于 GitLab 访问</span>
          </div>
          <input
            type="file"
            onChange={handleFileUpload}
            style={{ marginBottom: 8, color: '#a6adc8', fontSize: 13 }}
          />
          {sshPrivateKey && (
            <div style={{ fontSize: 12, color: '#a6e3a1', marginBottom: 8 }}>
              已选择密钥 ({sshPrivateKey.length} 字符)
            </div>
          )}
        </div>
        <div style={styles.field}>
          <div style={styles.fieldHeader}>
            <label style={styles.fieldLabel}>GitLab 域名</label>
          </div>
          <input
            style={styles.input}
            value={sshGitlabDomain}
            onChange={(e) => setSshGitlabDomain(e.target.value)}
            placeholder="如: gitlab.example.com"
          />
        </div>
        <div style={styles.sshActions}>
          <button
            style={styles.saveBtn}
            onClick={handleSshKeySave}
            disabled={sshSaving || !sshPrivateKey.trim() || !sshGitlabDomain.trim()}
          >
            {sshSaving ? '保存中...' : '保存密钥'}
          </button>
          <button
            style={styles.testBtn}
            onClick={handleSshTest}
            disabled={sshTesting}
          >
            {sshTesting ? '测试中...' : '测试连接'}
          </button>
        </div>
        {sshTestResult && (
          <div
            style={{
              ...styles.testResult,
              color: sshTestResult.startsWith('成功') ? '#a6e3a1' : '#f38ba8',
            }}
          >
            {sshTestResult}
          </div>
        )}
      </section>

      {/* JWT Settings */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>JWT 设置</h2>
        {jwtKeys.map(renderConfigField)}
      </section>

      {/* Other configs */}
      {otherKeys.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>其他配置</h2>
          {otherKeys.map(renderConfigField)}
        </section>
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
    maxWidth: 900,
    margin: '0 auto',
    color: '#cdd6f4',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#cdd6f4',
    margin: '0 0 24px 0',
  },
  loading: {
    textAlign: 'center' as const,
    padding: 40,
    color: '#6c7086',
  },
  section: {
    background: '#313244',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    border: '1px solid #45475a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#89b4fa',
    margin: '0 0 16px 0',
    borderBottom: '1px solid #45475a',
    paddingBottom: 8,
  },
  field: {
    marginBottom: 16,
  },
  fieldHeader: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#cdd6f4',
    fontFamily: 'monospace',
  },
  fieldDesc: {
    display: 'block',
    fontSize: 11,
    color: '#6c7086',
    marginTop: 2,
  },
  fieldRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
  },
  textarea: {
    flex: 1,
    background: '#1e1e2e',
    border: '1px solid #45475a',
    borderRadius: 6,
    color: '#cdd6f4',
    fontSize: 13,
    padding: '8px 10px',
    fontFamily: 'monospace',
    resize: 'vertical' as const,
    outline: 'none',
  },
  input: {
    width: '100%',
    background: '#1e1e2e',
    border: '1px solid #45475a',
    borderRadius: 6,
    color: '#cdd6f4',
    fontSize: 13,
    padding: '8px 10px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  saveBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  testBtn: {
    background: '#a6e3a1',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  sshActions: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
  },
  testResult: {
    marginTop: 8,
    fontSize: 13,
    padding: '6px 10px',
    background: '#1e1e2e',
    borderRadius: 4,
  },
};

export default SystemConfigPage;
