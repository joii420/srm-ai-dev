import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  pageType?: string;
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
/*  File naming validation (strategy by page type)                     */
/* ------------------------------------------------------------------ */

/**
 * Validate jsObject file name for appsmith pages.
 * Rules: starts with letter, no Chinese, no symbols (except trailing .js), must be .js file.
 */
function validateAppsmithFileName(name: string): string | null {
  if (!name) return '文件名不能为空';
  // Remove .js suffix for validation if present
  const baseName = name.endsWith('.js') ? name.slice(0, -3) : name;
  if (!baseName) return '文件名不能为空';
  if (!/^[a-zA-Z]/.test(baseName)) return '文件名必须以英文字母开头';
  if (/[\u4e00-\u9fff]/.test(baseName)) return '文件名不能包含汉字';
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(baseName)) return '文件名只能包含英文字母、数字和下划线';
  if (!name.endsWith('.js')) return '文件名必须以 .js 结尾';
  return null;
}

/**
 * Validate file name based on page type.
 * Returns error message or null if valid.
 */
function validateFileName(name: string, pageType?: string): string | null {
  if (pageType === 'appsmith') {
    return validateAppsmithFileName(name);
  }
  // Normal type: basic validation only (future: add specific rules)
  if (!name || !name.trim()) return '文件名不能为空';
  return null;
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
  /** Optional input validator. Returns error string or null if valid. */
  validate?: (value: string) => string | null;
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
  validate,
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(defaultValue);
  const [validationError, setValidationError] = useState<string | null>(null);

  const tryConfirm = () => {
    const trimmed = input ? value.trim() : undefined;
    if (input && !trimmed) return;
    if (input && validate && trimmed) {
      const err = validate(trimmed);
      if (err) { setValidationError(err); return; }
    }
    onConfirm(trimmed);
  };

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
            onChange={(e) => { setValue(e.target.value); setValidationError(null); }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') tryConfirm();
            }}
          />
        )}
        {validationError && <p className="lc-error">{validationError}</p>}
        <div className="dialog-buttons">
          <button
            className="btn btn-p"
            onClick={tryConfirm}
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
  pageType?: string;
  onRefresh: () => void;
}

const TreeNodeRow: React.FC<TreeNodeRowProps> = ({ node, depth, pageId, mode, pageType, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const { openFile, renameTab } = useEditorStore();
  const isEditable = mode === 'editable';
  const canCreateDir = isEditable && pageType !== 'appsmith';

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

  /**
   * Check if a file path is a jsObject file (jsObjects/*.js) on an appsmith page.
   */
  const isJsObjectFile = (filePath: string): boolean => {
    return pageType === 'appsmith' && filePath.startsWith('jsObjects/') && filePath.endsWith('.js');
  };

  /**
   * Extract jsObject collection name from file path.
   * e.g. "jsObjects/JSObject1.js" → "JSObject1"
   */
  const getJsObjectName = (filePath: string): string => {
    return filePath.replace('jsObjects/', '').replace('.js', '');
  };

  /**
   * Check if a directory is the jsObjects directory on an appsmith page.
   */
  const isJsObjectsDir = (filePath: string): boolean => {
    return pageType === 'appsmith' && filePath === 'jsObjects';
  };

  const handleDelete = async () => {
    try {
      if (node.type === 'file' && isJsObjectFile(node.path)) {
        // Use jsObject endpoint for appsmith jsObject files
        const jsName = getJsObjectName(node.path);
        await apiClient.delete(`/pages/${pageId}/jsobject/${encodeURIComponent(jsName)}`);
      } else {
        await apiClient.delete(`/pages/${pageId}/container/files/${encodeURIComponent(node.path)}`);
      }
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
      if (type === 'file' && isJsObjectsDir(basePath)) {
        // Use jsObject endpoint for creating files in jsObjects/ directory
        const jsName = name.endsWith('.js') ? name.replace('.js', '') : name;
        await apiClient.post(`/pages/${pageId}/jsobject/create`, { name: jsName });
      } else if (type === 'file') {
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
      if (node.type === 'file' && isJsObjectFile(node.path)) {
        // Use jsObject rename endpoint for appsmith jsObject files
        const oldJsName = getJsObjectName(node.path);
        const newJsName = newName.endsWith('.js') ? newName.replace('.js', '') : newName;
        await apiClient.post(`/pages/${pageId}/jsobject/rename`, {
          oldName: oldJsName,
          newName: newJsName,
        });
        // Update the newPath to reflect the .js extension
        const actualNewName = newJsName + '.js';
        const actualNewPath = parentDir ? `${parentDir}/${actualNewName}` : actualNewName;
        renameTab(node.path, {
          id: actualNewPath,
          filePath: actualNewPath,
          fileName: actualNewName,
          language: getLanguage(actualNewName),
        });
      } else if (node.type === 'file') {
        // Read old content, create new, delete old
        const res = await apiClient.get<{ content: string }>(
          `/pages/${pageId}/container/files/${encodeURIComponent(node.path)}`,
        );
        await apiClient.post(`/pages/${pageId}/container/files/${encodeURIComponent(newPath)}`, {
          content: res.data.content ?? '',
        });
        await apiClient.delete(`/pages/${pageId}/container/files/${encodeURIComponent(node.path)}`);
        renameTab(node.path, {
          id: newPath,
          filePath: newPath,
          fileName: newName,
          language: getLanguage(newName),
        });
      } else {
        // For directories: create new dir placeholder
        await apiClient.post(
          `/pages/${pageId}/container/files/${encodeURIComponent(newPath + '/.gitkeep')}`,
          { content: '' },
        );
        // TODO: move children — for now only renames empty or single-level dirs
        await apiClient.delete(`/pages/${pageId}/container/files/${encodeURIComponent(node.path)}`);
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
                {canCreateDir && (
                  <button
                    className="fi-act-btn"
                    title="新建目录"
                    onClick={() => setDialog({ type: 'newDir' })}
                  >{'\u{1F4C1}'}</button>
                )}
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
              pageType={pageType}
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
          inputPlaceholder={pageType === 'appsmith' ? '例如: MyObject.js' : '输入文件名'}
          validate={(name) => validateFileName(name, pageType)}
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
          validate={(name) => validateFileName(name, pageType)}
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

/* ------------------------------------------------------------------ */
/*  DepsPanel — shows dependency files from /deps/ directory            */
/* ------------------------------------------------------------------ */

const DepsPanel: React.FC<{ pageId: string }> = ({ pageId }) => {
  const [depsFiles, setDepsFiles] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const { openFile } = useEditorStore();

  const fetchDeps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<TreeNode[] | { tree: TreeNode[] }>(
        `/pages/${pageId}/container/tree`,
      );
      const data = res.data;
      const tree: TreeNode[] = Array.isArray(data) ? data : data.tree;
      // Find the deps directory and show its children
      const depsNode = tree.find((n) => n.name === 'deps' && n.type === 'directory');
      setDepsFiles(depsNode?.children ?? []);
    } catch {
      setDepsFiles([]);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    fetchDeps();
  }, [fetchDeps]);

  const handleClick = (node: TreeNode) => {
    if (node.type === 'file') {
      openFile({
        id: node.path,
        filePath: node.path,
        fileName: node.name,
        language: getLanguage(node.name),
        readOnly: true,
      });
    }
  };

  if (loading) {
    return (
      <div className="center-col" style={{ padding: 20 }}>
        <span style={{ color: 'var(--t2)', fontSize: 13 }}>加载中...</span>
      </div>
    );
  }

  if (depsFiles.length === 0) {
    return (
      <div className="center-col" style={{ padding: 20 }}>
        <span style={{ color: 'var(--t3)', fontSize: 13 }}>暂无依赖文件</span>
      </div>
    );
  }

  return (
    <div className="file-tree-body" role="tree">
      {depsFiles.map((node) => (
        <div
          key={node.path}
          className="fi"
          style={{ paddingLeft: 12 }}
          onClick={() => handleClick(node)}
          role="treeitem"
          tabIndex={0}
        >
          <span className="fi-icon">{getFileIcon(node.name)}</span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.name}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  FileTree (main component with tabs)                                */
/* ------------------------------------------------------------------ */

type LeftTab = 'files' | 'deps';

const FileTree: React.FC<FileTreeProps> = ({ pageId, mode, pageType }) => {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isEditable = mode === 'editable';
  const isAppsmith = pageType === 'appsmith';
  const canCreateDir = isEditable && !isAppsmith;

  const [activeTab, setActiveTab] = useState<LeftTab>('files');

  // Root-level dialog
  const [rootDialog, setRootDialog] = useState<'newFile' | 'newDir' | null>(null);

  const fetchTree = useCallback(async () => {
    // Wait until page status is loaded (pageType is set) to avoid double fetch
    // when mode transitions from initial 'readonly-free' to actual mode
    if (!pageId || pageId === 'undefined' || pageType === undefined) return;
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
  }, [pageId, mode, pageType]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  /**
   * For appsmith pages, filter tree to only show jsObjects directory and its contents.
   */
  const displayTree = useMemo(() => {
    if (!isAppsmith) return tree;
    const jsObjectsNode = tree.find((n) => n.name === 'jsObjects' && n.type === 'directory');
    if (jsObjectsNode && jsObjectsNode.children) {
      return jsObjectsNode.children;
    }
    return [];
  }, [tree, isAppsmith]);

  const handleRootCreate = async (name: string, type: 'file' | 'dir') => {
    try {
      if (isAppsmith) {
        const jsName = name.endsWith('.js') ? name.slice(0, -3) : name;
        await apiClient.post(`/pages/${pageId}/jsobject/create`, { name: jsName });
      } else if (type === 'file') {
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

  // --- Files tab content ---
  const renderFilesTab = () => {
    if (loading) {
      return (
        <div className="center-col" style={{ padding: 20 }}>
          <span style={{ color: 'var(--t2)', fontSize: 13 }}>加载中...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="center-col" style={{ padding: 20 }}>
          <span style={{ color: 'var(--red)', fontSize: 13 }}>{error}</span>
          <button className="retry-btn-sm" onClick={fetchTree}>重试</button>
        </div>
      );
    }

    return (
      <>
        <div className="sl-section">
          <span className="sl-label">{isAppsmith ? 'JS Objects' : '文件'}</span>
          {isEditable && (
            <span className="sl-actions">
              <button
                className="fi-act-btn"
                title={isAppsmith ? '新建 JS Object' : '新建文件'}
                onClick={() => setRootDialog('newFile')}
              >+</button>
              {canCreateDir && (
                <button
                  className="fi-act-btn"
                  title="新建目录"
                  onClick={() => setRootDialog('newDir')}
                >{'\u{1F4C1}'}</button>
              )}
            </span>
          )}
        </div>
        <div className="file-tree-body" role="tree">
          {displayTree.length === 0 ? (
            <div className="center-col" style={{ padding: 20 }}>
              <span style={{ color: 'var(--t3)', fontSize: 13 }}>
                {isAppsmith ? '暂无 JS Object 文件' : '无文件'}
              </span>
            </div>
          ) : (
            displayTree.map((node) => (
              <TreeNodeRow
                key={node.path}
                node={node}
                depth={0}
                pageId={pageId}
                mode={mode}
                pageType={pageType}
                onRefresh={fetchTree}
              />
            ))
          )}
        </div>
      </>
    );
  };

  return (
    <div className="ide-left">
      {/* Tab bar: only show when editable (container is running) */}
      {isEditable && (
        <div className="left-tabs">
          <div
            className={`left-tab${activeTab === 'files' ? ' on' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            项目文件
          </div>
          <div
            className={`left-tab${activeTab === 'deps' ? ' on' : ''}`}
            onClick={() => setActiveTab('deps')}
          >
            项目依赖
          </div>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'files' || !isEditable ? renderFilesTab() : <DepsPanel pageId={pageId} />}

      {/* Root-level dialogs */}
      {rootDialog === 'newFile' && (
        <Dialog
          title={isAppsmith ? '新建 JS Object' : '新建文件'}
          input
          inputPlaceholder={isAppsmith ? '例如: MyObject.js' : '输入文件名'}
          validate={(name) => validateFileName(name, pageType)}
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
