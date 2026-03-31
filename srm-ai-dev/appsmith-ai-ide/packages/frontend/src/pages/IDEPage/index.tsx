import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { useEditorStore } from '../../stores/editorStore';
import StatusButton, { IDEMode } from './StatusButton';
import { type EditLockState } from './EditLockBadge';
import FileTree from './FileTree';
import Editor, { type EditorHandle } from './Editor';
import ChatPanel, { type CodeSuggestion } from './ChatPanel';

interface PageStatus {
  id: string;
  name: string;
  type: string;
  status: 'free' | 'available' | 'checkedout' | 'mine';
  checkedOutBy: { username: string; displayName: string } | null;
}

const IDEPage: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const {
    openTabs,
    activeTabId,
    unsavedFiles,
    setActiveTab,
    closeTab,
    hasUnsavedFiles,
  } = useEditorStore();

  const [pageStatus, setPageStatus] = useState<PageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<CodeSuggestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [editLockState, setEditLockState] = useState<EditLockState | null>(null);
  const editorRef = useRef<EditorHandle>(null);

  const fetchPageStatus = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ pages: PageStatus[] } | PageStatus[]>('/pages');
      const data = res.data;
      const pages = Array.isArray(data) ? data : data.pages;
      const found = pages.find((p) => p.id === pageId);
      if (found) {
        if ((found.status as string) === 'available') {
          found.status = 'free';
        }
        setPageStatus(found);
      } else {
        setPageStatus({
          id: pageId!,
          name: pageId!,
          status: 'free',
          checkedOutBy: null,
        });
      }
    } catch {
      setError('加载页面状态失败');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    fetchPageStatus();
  }, [fetchPageStatus]);

  const fetchEditLockState = useCallback(() => {
    if (!pageId) return;
    apiClient.get(`/pages/${pageId}/edit-lock-state`)
      .then((res) => {
        const d = res.data as Record<string, unknown>;
        if (d.data) {
          setEditLockState(d.data as EditLockState);
        } else if (d.enabled === false) {
          setEditLockState(null);
        }
      })
      .catch(() => {
        setEditLockState(null);
      });
  }, [pageId]);

  useEffect(() => {
    fetchEditLockState();
  }, [fetchEditLockState]);

  const determineMode = (): IDEMode => {
    if (!pageStatus) return 'readonly-free';
    if (pageStatus.status === 'free' || pageStatus.status === 'available') return 'readonly-free';
    if (pageStatus.status === 'mine') return 'editable';
    return 'readonly-other';
  };

  const mode = determineMode();

  const handleCheckoutComplete = useCallback(() => {
    fetchPageStatus();
  }, [fetchPageStatus]);

  useEffect(() => {
    if (mode !== 'editable' || !pageId) return;
    const checkHealth = async () => {
      try {
        await apiClient.get(`/pages/${pageId}/container/health`);
      } catch {
        console.warn('Container health check failed, releasing checkout...');
        try {
          await apiClient.post(`/pages/${pageId}/release`);
        } catch {
          /* ignore */
        }
        fetchPageStatus();
      }
    };
    checkHealth();
  }, [mode, pageId, fetchPageStatus]);

  const handleCodeSuggestion = useCallback((suggestion: CodeSuggestion) => {
    setPendingSuggestion(suggestion);
  }, []);

  const handleSuggestionHandled = useCallback(() => {
    setPendingSuggestion(null);
  }, []);

  const handleSaveAll = useCallback(async () => {
    if (!hasUnsavedFiles() || mode !== 'editable') return;
    setSaving(true);
    try {
      await editorRef.current?.saveAll();
    } catch {
      console.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, [hasUnsavedFiles, mode]);

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  if (!pageId) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: 'var(--red)' }}>缺少页面ID</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: 'var(--t2)' }}>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <p style={{ color: 'var(--red)' }}>{error}</p>
        <button className="btn btn-p" onClick={fetchPageStatus}>
          重试
        </button>
      </div>
    );
  }

  const pageName = pageStatus?.name || pageId;
  const isEditable = mode === 'editable';
  const showUnsaved = isEditable && hasUnsavedFiles();

  return (
    <>
      {/* ═══ TOPBAR ═══ */}
      <div className="topbar">
        <div style={{ display: 'flex', flexDirection: 'row', gap: 5, alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              paddingRight: 8,
              borderRight: '1px solid var(--b1)',
            }}
          >
            <span
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontSize: 8,
                color: 'var(--t4)',
                letterSpacing: '.8px',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              程序
            </span>
            <span className="page-name-pill" style={{ fontSize: 11 }}>
              {pageName}
            </span>
          </div>
          <button className="btn btn-g btn-sm" onClick={() => navigate('/pages')}>
            {'\u21A9'} 切换
          </button>
          <StatusButton
            mode={mode}
            pageId={pageId}
            checkedOutBy={pageStatus?.checkedOutBy?.displayName}
            onCheckoutComplete={handleCheckoutComplete}
            onSaveAll={handleSaveAll}
            editLockState={editLockState}
            onRefreshEditLock={fetchEditLockState}
          />
        </div>

        {/* File Tabs */}
        <div className="topbar-tabs">
          {openTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isUnsaved = unsavedFiles.has(tab.id);
            return (
              <div
                key={tab.id}
                className={`ttab${isActive ? ' on' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {isUnsaved && <span className="ttab-d" />}
                {tab.fileName}
                <span className="ttab-x" onClick={(e) => handleCloseTab(e, tab.id)}>
                  ×
                </span>
              </div>
            );
          })}
        </div>

        {/* Right area */}
        <div className="topbar-r">
          {showUnsaved && <span className="ed-unsaved">{'\u25CF'} 未保存</span>}
          {isEditable && showUnsaved && (
            <button
              className="save-btn"
              onClick={handleSaveAll}
              disabled={saving}
              data-tip="保存到容器本地，签入后推送至 GitLab"
            >
              {saving ? '保存中...' : '\u2193 保存'}
            </button>
          )}
          {isEditable && !showUnsaved && (
            <span className="save-btn-dis">{'\u2713'} 已保存</span>
          )}
          {isEditable && (
            <div className="pill pill-grn">
              <span className="pill-dot" />
              容器运行中
            </div>
          )}
        </div>
      </div>

      {/* Readonly-other banner */}
      {mode === 'readonly-other' && pageStatus?.checkedOutBy?.displayName && (
        <div
          className="diff-notice"
          style={{
            margin: '0',
            borderRadius: 0,
            borderLeft: '3px solid var(--amb)',
            background: 'rgba(245,158,11,.05)',
            borderColor: 'rgba(245,158,11,.2)',
          }}
        >
          <span>{'\u{1F512}'}</span>
          <div className="dn-txt" style={{ color: 'var(--amb)' }}>
            此页面已被{' '}
            <strong style={{ color: 'var(--t1)' }}>
              {pageStatus.checkedOutBy.displayName}
            </strong>{' '}
            签出，当前为只读模式
          </div>
        </div>
      )}

      {/* ═══ IDE WORKSPACE ═══ */}
      <div className="ide-wrap">
        <div className="ide-top-area">
          <FileTree pageId={pageId} mode={mode} pageType={pageStatus?.type} />
          <div
            className="filetree-resize-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const left = e.currentTarget.previousElementSibling as HTMLElement;
              if (!left) return;
              const startW = left.offsetWidth;
              const onMove = (ev: MouseEvent) => {
                const newW = Math.max(120, Math.min(500, startW + ev.clientX - startX));
                left.style.width = newW + 'px';
              };
              const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}
          />
          <div className="ide-editor">
            <Editor
              ref={editorRef}
              pageId={pageId}
              mode={mode}
              pendingSuggestion={pendingSuggestion}
              onSuggestionHandled={handleSuggestionHandled}
            />
          </div>
        </div>

        {mode !== 'readonly-other' && (
          <ChatPanel
            pageId={pageId}
            enabled={mode === 'editable'}
            onCodeSuggestion={handleCodeSuggestion}
          />
        )}
      </div>
    </>
  );
};

export default IDEPage;
