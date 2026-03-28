import React from 'react';
import type { SkillInfo } from '../../../stores/skillStore';

interface IntentBannerProps {
  skill: SkillInfo;
  onFillParams: () => void;
  onDismiss: () => void;
}

const IntentBanner: React.FC<IntentBannerProps> = ({
  skill,
  onFillParams,
  onDismiss,
}) => {
  return (
    <div style={styles.banner}>
      <span style={styles.text}>
        识别到 Skill：<strong>{skill.name}</strong> — 该 Skill 含模板参数
      </span>
      <div style={styles.actions}>
        <button style={styles.fillBtn} onClick={onFillParams}>
          填写参数
        </button>
        <button style={styles.dismissBtn} onClick={onDismiss} title="关闭">
          x
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 12px',
    background: '#313244',
    borderTop: '1px solid #45475a',
    gap: 8,
  },
  text: {
    color: '#f9e2af',
    fontSize: 12,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  fillBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 4,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    color: '#6c7086',
    fontSize: 14,
    cursor: 'pointer',
    padding: '0 4px',
  },
};

export default IntentBanner;
