import React, { useState } from 'react';

export interface EditLockState {
  icon?: string;
  button?: string;
  canEdit?: boolean;
  pageState?: {
    code?: string;
    state?: string;
    ip?: string;
    pageId?: string;
    acct?: string;
    time?: string;
  };
}

interface EditLockBadgeProps {
  data: EditLockState;
}

const stateLabel = (state?: string) => {
  switch (state) {
    case '1': return '已签入';
    case '2': return '已签出';
    default: return state ?? '-';
  }
};

const EditLockBadge: React.FC<EditLockBadgeProps> = ({ data }) => {
  const [hover, setHover] = useState(false);
  const ps = data.pageState;

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span
        style={{
          fontSize: 11,
          fontFamily: "'IBM Plex Mono',monospace",
          padding: '2px 8px',
          borderRadius: 5,
          cursor: 'default',
          whiteSpace: 'nowrap',
          background: data.canEdit ? 'var(--grn-dim)' : 'var(--amb-dim)',
          color: data.canEdit ? 'var(--grn)' : 'var(--amb)',
          border: `1px solid ${data.canEdit ? 'rgba(16,185,129,.3)' : 'rgba(245,158,11,.3)'}`,
        }}
      >
        {data.button ?? stateLabel(ps?.state)}
      </span>

      {hover && ps && (
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
          <div><span style={{ color: 'var(--t3)' }}>程序：</span><span style={{ color: 'var(--t1)' }}>{ps.code ?? '-'}</span></div>
          <div><span style={{ color: 'var(--t3)' }}>状态：</span><span style={{ color: 'var(--t1)' }}>{stateLabel(ps.state)}</span></div>
          <div><span style={{ color: 'var(--t3)' }}>操作人：</span><span style={{ color: 'var(--t1)' }}>{ps.acct ?? '-'}</span></div>
          <div><span style={{ color: 'var(--t3)' }}>IP：</span><span style={{ color: 'var(--t1)' }}>{ps.ip ?? '-'}</span></div>
          <div><span style={{ color: 'var(--t3)' }}>时间：</span><span style={{ color: 'var(--t1)' }}>{ps.time ?? '-'}</span></div>
        </div>
      )}
    </div>
  );
};

export default EditLockBadge;
