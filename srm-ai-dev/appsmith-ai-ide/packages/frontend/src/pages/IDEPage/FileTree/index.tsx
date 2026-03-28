import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../services/api';
import { useEditorStore, EditorTab } from '../../../stores/editorStore';
import type { IDEMode } from '../StatusButton';

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

interface FileTreeProps {
  pageId: string;
  mode: IDEMode;
}

function getLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js': case 'jsx': return 'javascript';
    case 'ts': case 'tsx': return 'typescript';
    case 'json': return 'json';
    case 'css': return 'css';
    case 'html': return 'html';
    case 'md': return 'markdown';
    case 'xml': return 'xml';
    case 'yaml': case 'yml': return 'yaml';
    default: return 'plaintext';
  }
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'json': return '\u{1F4CB}';
    case 'js': case 'jsx': return '\u{1F7E8}';
    case 'ts': case 'tsx': return '\u{1F7E6}';
    case 'css': return '\u{1F3A8}';
    case 'html': return '\u{1F310}';
    case 'md': return '\u{1F4DD}';
    case 'xml': case 'yaml': case 'yml': return '\u2699';
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': return '\u{1F5BC}';
    default: return '\u{1F4C4}';
  }
}

/* ------------------------------------------------------------------ */
/*  Dialog component                                                   */
/* ------------------------------------------------------------------ */

interface DialogProps {
  title: string;
  message?: string;
  input?: boolean;
  inputPlaceholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}

const Dialog: React.FC<DialogProps> = ({
  title,
  message,
  input,
  inputPlaceholder,
  defaultValue = '',
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="loading-screen on" onClick={onCancel}>
      <div className="loading-card" onClick={(e) => e.stopPropagation()}>
        <p className="lc-title">{title}</p>
        {message && <p className="dialog-text">{message}</p>}
        {input && (
          <input
            type="text"
            className="commit-input"
            placeholder={inputPlaceholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim()) onConfirm(value.trim());
            }}
          />
        )}
        <div className="dialog-buttons">
          <button
            className="btn btn-p"
            onClick={() => onConfirm(input ? value.trim() : undefined)}
            disabled={input ? !value.trim() : false}
            style={{ opacity: input && !value.trim() ? 0.5 : 1 }}
          >
            {confirmText}
          </button>
          <button className="btn btn-grey" style={{ cursor: 'pointer' }} onClick={onCancel}>
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  TreeNodeRow                                                        */
/* ------------------------------------------------------------------ */

interface TreeNodeRowProps {
  node: TreeNode;
  depth: number;
  pageId: string;
  mode: IDEMode;
  onRefresh: () => void;
}

const TreeNodeRow: React.FC<TreeNodeRowProps> = ({ node, depth, pageId, mode, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const { openFile, renameTab } = useEditorStore();
  const isEditable = mode === 'editable';

  // Dialog state
  const [dialog, setDialog] = useState<{
    type: 'delete' | 'newFile' | 'newDir' | 'rename';
  } | null>(null);

  const handleClick = () => {
    if (node.type === 'directory') {
      setExpanded(!expanded);
    } else {
      const tab: EditorTab = {
        id: node.path,
        filePath: node.path,
        fileName: node.name,
        language: getLanguage(node.name),
      };
      openFile(tab);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/pages/${pageId}/container/files/${encodeURIComponent(node.path)}`);
      setDialog(null);
      onRefresh();
    } catch {
      console.error('删除失败');
      setDialog(null);
    }
  };

  const handleCreate = async (name: string, type: 'file' | 'dir') => {
    const basePath = node.type === 'directory' ? node.path : '';
    const newPath = basePath ? `${basePath}/${name}` : name;
    try {
      if (type === 'file') {
        await apiClient.post(`/pages/${pageId}/container/files/${encodeURIComponent(newPath)}`, {
          content: '',
        });
      } else {
        // Create directory by creating a placeholder file inside it
        await apiClient.post(
          `/pages/${pageId}/container/files/${encodeURIComponent(newPath + '/.gitkeep')}`,
          { content: '' },
        );
      }
      setDialog(null);
      if (node.type === 'directory') setExpanded(true);
      onRefresh();
    } catch {
      console.error('创建失败');
      setDialog(null);
    }
  };

  const handleRename = async (newName: string) => {
    const parentDir = node.path.includes('/') ? node.path.substring(0, node.path.lastIndexOf('/')) : '';
    const newPath = parentDir ? `${parentDir}/${newName}` : newName;
    try {
      if (node.type === 'file') {
        // Read old content, create new, delete old
        const res = await apiClient.get<{ content: string }>(
          `/pages/${pageId}/container/files/${encodeURIComponent(node.path)}`,
        );
        await apiClient.post(`/pages/${pageId}/container/files/${encodeURIComponent(newPath)}`, {
          content: res.data.content ?? '',
        });
      } else {
        // For directories: create new dir placeholder
        await apiClient.post(
          `/pages/${pageId}/container/files/${encodeURIComponent(newPath + '/.gitkeep')}`,
          { content: '' },
        );
        // TODO: move children — for now only renames empty or single-level dirs
      }
      await apiClient.delete(`/pages/${pageId}/container/files/${encodeURIComponent(node.path)}`);
      // Sync editor tab so the old path is replaced with the new one
      if (node.type === 'file') {
        renameTab(node.path, {
          id: newPath,
          filePath: newPath,
          fileName: newName,
          language: getLanguage(newName),
        });
      }
      setDialog(null);
      onRefresh();
    } catch {
      console.error('重命名失败');
      setDialog(null);
    }
  };

  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      <div
        className={`fi${node.type === 'directory' ? ' fdir' : ''}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
        role="treeitem"
        tabIndex={0}
      >
        {node.type === 'directory' ? (
          <span className="fdir-arrow">{expanded ? '\u{1F4C2}' : '\u{1F4C1}'}</span>
        ) : (
          <span className="fi-icon">{getFileIcon(node.name)}</span>
        )}
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
        {isEditable && (
          <span className="fi-actions" onClick={stopProp}>
            {node.type === 'directory' && (
              <>
                <button
                  className="fi-act-btn"
                  title="新建文件"
                  onClick={() => setDialog({ type: 'newFile' })}
                >+</button>
                <button
                  className="fi-act-btn"
                  title="新建目录"
                  onClick={() => setDialog({ type: 'newDir' })}
                >{'\u{1F4C1}'}</button>
              </>
            )}
            <button
              className="fi-act-btn"
              title="重命名"
              onClick={() => setDialog({ type: 'rename' })}
            >{'\u270E'}</button>
            <button
              className="fi-act-btn fi-act-del"
              title="删除"
              onClick={() => setDialog({ type: 'delete' })}
            >{'\u00D7'}</button>
          </span>
        )}
      </div>

      {node.type === 'directory' && expanded && node.children && (
        <div className="fdir-children" role="group">
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              pageId={pageId}
              mode={mode}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {dialog?.type === 'delete' && (
        <Dialog
          title="删除确认"
          message={`是否删除${node.type === 'directory' ? '目录' : '文件'} "${node.name}"？`}
          onConfirm={handleDelete}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'newFile' && (
        <Dialog
          title="新建文件"
          input
          inputPlaceholder="输入文件名"
          onConfirm={(name) => name && handleCreate(name, 'file')}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'newDir' && (
        <Dialog
          title="新建目录"
          input
          inputPlaceholder="输入目录名"
          onConfirm={(name) => name && handleCreate(name, 'dir')}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'rename' && (
        <Dialog
          title="重命名"
          input
          inputPlaceholder="输入新名称"
          defaultValue={node.name}
          onConfirm={(name) => name && name !== node.name && handleRename(name)}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  FileTree                                                           */
/* ------------------------------------------------------------------ */

const FileTree: React.FC<FileTreeProps> = ({ pageId, mode }) => {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isEditable = mode === 'editable';

  // Root-level dialog
  const [rootDialog, setRootDialog] = useState<'newFile' | 'newDir' | null>(null);

  const fetchTree = useCallback(async () => {
    if (!pageId || pageId === 'undefined') return;
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        mode === 'editable'
          ? `/pages/${pageId}/container/tree`
          : `/pages/${pageId}/tree`;

      const res = await apiClient.get<TreeNode[] | { tree: TreeNode[] }>(endpoint);
      const data = res.data;
      setTree(Array.isArray(data) ? data : data.tree);
    } catch {
      setError('文件树加载失败');
    } finally {
      setLoading(false);
    }
  }, [pageId, mode]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const handleRootCreate = async (name: string, type: 'file' | 'dir') => {
    try {
      if (type === 'file') {
        await apiClient.post(`/pages/${pageId}/container/files/${encodeURIComponent(name)}`, {
          content: '',
        });
      } else {
        await apiClient.post(
          `/pages/${pageId}/container/files/${encodeURIComponent(name + '/.gitkeep')}`,
          { content: '' },
        );
      }
      setRootDialog(null);
      fetchTree();
    } catch {
      console.error('创建失败');
      setRootDialog(null);
    }
  };

  if (loading) {
    return (
      <div className="ide-left">
        <div className="sl-section">
          <span className="sl-label">文件</span>
        </div>
        <div className="center-col" style={{ padding: 20 }}>
          <span style={{ color: 'var(--t2)', fontSize: 12 }}>加载中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ide-left">
        <div className="sl-section">
          <span className="sl-label">文件</span>
        </div>
        <div className="center-col" style={{ padding: 20 }}>
          <span style={{ color: 'var(--red)', fontSize: 12 }}>{error}</span>
          <button className="retry-btn-sm" onClick={fetchTree}>重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ide-left">
      <div className="sl-section">
        <span className="sl-label">文件</span>
        {isEditable && (
          <span className="sl-actions">
            <button
              className="fi-act-btn"
              title="新建文件"
              onClick={() => setRootDialog('newFile')}
            >+</button>
            <button
              className="fi-act-btn"
              title="新建目录"
              onClick={() => setRootDialog('newDir')}
            >{'\u{1F4C1}'}</button>
          </span>
        )}
      </div>
      <div className="file-tree-body" role="tree">
        {tree.length === 0 ? (
          <div className="center-col" style={{ padding: 20 }}>
            <span style={{ color: 'var(--t3)', fontSize: 12 }}>无文件</span>
          </div>
        ) : (
          tree.map((node) => (
            <TreeNodeRow
              key={node.path}
              node={node}
              depth={0}
              pageId={pageId}
              mode={mode}
              onRefresh={fetchTree}
            />
          ))
        )}
      </div>

      {/* Root-level dialogs */}
      {rootDialog === 'newFile' && (
        <Dialog
          title="新建文件"
          input
          inputPlaceholder="输入文件名"
          onConfirm={(name) => name && handleRootCreate(name, 'file')}
          onCancel={() => setRootDialog(null)}
        />
      )}
      {rootDialog === 'newDir' && (
        <Dialog
          title="新建目录"
          input
          inputPlaceholder="输入目录名"
          onConfirm={(name) => name && handleRootCreate(name, 'dir')}
          onCancel={() => setRootDialog(null)}
        />
      )}
    </div>
  );
};

export default FileTree;
