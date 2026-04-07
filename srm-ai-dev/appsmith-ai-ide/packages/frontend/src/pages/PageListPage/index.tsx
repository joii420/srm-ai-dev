import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api';


interface PageItem {
  id: string;
  name: string;
  type: string;
  description: string | null;
  gitlabRepoUrl: string;
  gitBranch: string;
  status: 'free' | 'available' | 'checkedout' | 'mine';
  checkedOutBy: { username: string; displayName: string } | null;
  updatedAt: string | null;
  checkedOutAt: string | null;
}

/** Format ISO datetime string to readable local time */
function formatTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return isoStr;
  }
}

type StatusFilter = 'all' | 'free' | 'mine';

const PageListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: pages = [], isLoading, error } = useQuery<PageItem[]>({
    queryKey: ['pages'],
    queryFn: async () => {
      const res = await apiClient.get<{ pages: PageItem[] } | PageItem[]>('/pages');
      const data = res.data;
      return Array.isArray(data) ? data : data.pages;
    },
  });

  const isFree = (page: PageItem): boolean => {
    return page.status === 'free' || page.status === 'available';
  };

  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      if (search && !page.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilter === 'free') {
        return isFree(page);
      }
      if (statusFilter === 'mine') {
        return page.status === 'mine';
      }
      return true;
    });
  }, [pages, search, statusFilter]);

  const isCheckedOutByOther = (page: PageItem): boolean => {
    return page.status === 'checkedout';
  };

  const getStatusBadge = (page: PageItem) => {
    if (isFree(page)) {
      return <span className="badge badge-free">空闲</span>;
    }
    if (page.status === 'mine') {
      return <span className="badge badge-me">我的签出</span>;
    }
    return (
      <span className="badge badge-busy">
        已签出 - {page.checkedOutBy?.displayName || '其他用户'}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    if (type === 'appsmith') {
      return <span className="badge badge-type-appsmith">Appsmith</span>;
    }
    return <span className="badge badge-type-normal">普通</span>;
  };

  const handleCreateSuccess = useCallback(() => {
    setShowCreateDialog(false);
    queryClient.invalidateQueries({ queryKey: ['pages'] });
  }, [queryClient]);

  const filterButtons: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'free', label: '空闲' },
    { key: 'mine', label: '我的签出' },
  ];

  if (isLoading) {
    return (
      <div className="center-msg">
        <p style={{ color: 'var(--t2)' }}>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="center-msg">
        <p style={{ color: 'var(--red)' }}>加载失败，请刷新重试</p>
      </div>
    );
  }

  return (
    <div className="checkout-wrap">
      <div className="checkout-hero">
        <h1>程序列表</h1>
      </div>

      <div className="checkout-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索程序名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setStatusFilter(btn.key)}
              className={`ftab${statusFilter === btn.key ? ' on' : ''}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <button
          className="btn btn-p"
          onClick={() => setShowCreateDialog(true)}
          style={{ marginLeft: 'auto' }}
        >
          + 新建程序
        </button>
      </div>

      {filteredPages.length === 0 ? (
        <div className="empty-state">
          <p>未找到程序</p>
        </div>
      ) : (
        <div className="page-grid">
          {filteredPages.map((page) => {
            const otherCheckout = isCheckedOutByOther(page);
            return (
              <div
                key={page.id}
                className={`page-card${otherCheckout ? ' disabled' : ''}`}
                onClick={() => {
                  navigate(`/ide/${page.id}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/ide/${page.id}`);
                }}
                role="button"
                tabIndex={0}
              >
                <div className="pc-head">
                  <h3 className="pc-name">{page.name}</h3>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {getTypeBadge(page.type)}
                    {getStatusBadge(page)}
                  </div>
                </div>
                {page.description && (
                  <div className="pc-desc">{page.description}</div>
                )}
                <div className="pc-meta">
                  <span>修改时间: {formatTime(page.updatedAt)}</span>
                  {(page.status === 'mine' || otherCheckout) && page.checkedOutAt && (
                    <span>签出时间: {formatTime(page.checkedOutAt)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateDialog && (
        <CreatePageDialog
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Create Page Dialog                                                 */
/* ------------------------------------------------------------------ */

interface CreatePageDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreatePageDialog: React.FC<CreatePageDialogProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'appsmith' | 'normal'>('appsmith');
  const [appsmithPageId, setAppsmithPageId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      await apiClient.post('/pages/create', {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        gitBranch: 'dev',
        ...(type === 'appsmith' && appsmithPageId.trim() ? { appsmithPageId: appsmithPageId.trim() } : {}),
      });
      onSuccess();
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { message?: string } } }).response;
      setError(resp?.data?.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="loading-screen on" onClick={onClose}>
      <div className="loading-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <p className="lc-title">新建程序</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={labelStyle}>
            <span>程序名称 <span style={{ color: 'var(--red)' }}>*</span></span>
            <input
              className="commit-input"
              placeholder="例如: DashboardPage"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={submitting}
            />
            <span style={hintStyle}>将以此名称自动创建远程 Git 仓库</span>
          </label>

          <label style={labelStyle}>
            <span>描述</span>
            <textarea
              className="commit-input"
              placeholder="程序描述（选填）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </label>

          <label style={labelStyle}>
            <span>程序类型</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`ftab${type === 'appsmith' ? ' on' : ''}`}
                onClick={() => setType('appsmith')}
                disabled={submitting}
                type="button"
                style={type === 'appsmith' ? { border: '2px solid var(--acc)', background: 'var(--acc-dim)' } : {}}
              >
                Appsmith 程序
              </button>
              <button
                className={`ftab${type === 'normal' ? ' on' : ''}`}
                onClick={() => setType('normal')}
                disabled={submitting}
                type="button"
                style={type === 'normal' ? { border: '2px solid var(--acc)', background: 'var(--acc-dim)' } : {}}
              >
                普通程序
              </button>
            </div>
          </label>

          {type === 'appsmith' && (
            <label style={labelStyle}>
              <span>Appsmith PageId</span>
              <input
                className="commit-input"
                placeholder="例如: 6803e29ae4b0cb228bd0e8b2"
                value={appsmithPageId}
                onChange={(e) => setAppsmithPageId(e.target.value)}
                disabled={submitting}
              />
              <span style={hintStyle}>Appsmith 页面 ID，签出时自动拼接编辑接口同步 JS 对象（选填）</span>
            </label>
          )}
        </div>

        {error && <p className="lc-error">{error}</p>}

        <div className="dialog-buttons" style={{ marginTop: 12 }}>
          <button
            className="btn btn-p"
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            style={{ opacity: !name.trim() || submitting ? 0.5 : 1 }}
          >
            {submitting ? '创建仓库中...' : '创建'}
          </button>
          <button
            className="btn btn-grey"
            style={{ cursor: 'pointer' }}
            onClick={onClose}
            disabled={submitting}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12,
  color: 'var(--t2)',
};

const hintStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--t3)',
};

export default PageListPage;
