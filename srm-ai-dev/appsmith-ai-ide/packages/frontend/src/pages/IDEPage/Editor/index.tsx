import React, { useState, useCallback, useRef, useImperativeHandle } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MonacoEditor = any;
import { useEditorStore } from '../../../stores/editorStore';
import { apiClient } from '../../../services/api';
import type { IDEMode } from '../StatusButton';
import type { CodeSuggestion } from '../ChatPanel';
import DiffBanner from './DiffBanner';
import { applyUnifiedDiff } from '../../../utils/applyDiff';

export interface EditorHandle {
  saveAll: () => Promise<void>;
}

interface EditorProps {
  pageId: string;
  mode: IDEMode;
  pendingSuggestion?: CodeSuggestion | null;
  onSuggestionHandled?: () => void;
}

const Editor = React.forwardRef<EditorHandle, EditorProps>(({
  pageId,
  mode,
  pendingSuggestion,
  onSuggestionHandled,
}, ref) => {
  const {
    openTabs,
    activeTabId,
    unsavedFiles,
    markUnsaved,
    clearAllUnsaved,
    hasUnsavedFiles,
    setCursorPosition,
  } = useEditorStore();

  // Store file contents keyed by tab id (file path)
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loadingFile, setLoadingFile] = useState(false);
  const [, setSaving] = useState(false);
  const originalContents = useRef<Record<string, string>>({});
  const loadedFiles = useRef<Set<string>>(new Set());
  const editorRef = useRef<MonacoEditor | null>(null);

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const isReadOnly = mode !== 'editable' || (activeTab?.readOnly === true);

  // Load file content when tab becomes active — uses ref to prevent re-fetch loops
  const loadFileContent = useCallback(
    async (filePath: string) => {
      if (loadedFiles.current.has(filePath)) return;
      loadedFiles.current.add(filePath);

      setLoadingFile(true);
      try {
        // Editable mode: GET /pages/{pageId}/container/files/{path} (path param)
        // Readonly mode: GET /pages/{pageId}/files?path={path} (query param)
        const res = mode === 'editable'
          ? await apiClient.get<{ content: string }>(
              `/pages/${pageId}/container/files/${encodeURIComponent(filePath)}`,
            )
          : await apiClient.get<{ content: string }>(
              `/pages/${pageId}/files`,
              { params: { path: filePath } },
            );

        const content = res.data.content ?? '';
        setFileContents((prev) => ({ ...prev, [filePath]: content }));
        originalContents.current[filePath] = content;
      } catch {
        setFileContents((prev) => ({
          ...prev,
          [filePath]: `// 无法加载文件: ${filePath}`,
        }));
      } finally {
        setLoadingFile(false);
      }
    },
    [mode, pageId],
  );

  // Load content when active tab changes
  React.useEffect(() => {
    if (activeTabId && !loadedFiles.current.has(activeTabId)) {
      loadFileContent(activeTabId);
    }
  }, [activeTabId, loadFileContent]);

  // Migrate cached content when a tab is renamed (path changed)
  const prevTabIds = useRef<Set<string>>(new Set());
  React.useEffect(() => {
    const currentIds = new Set(openTabs.map((t) => t.id));
    // Detect rename: a new id appeared and an old id disappeared, tab count unchanged
    if (currentIds.size === prevTabIds.current.size) {
      const added: string[] = [];
      const removed: string[] = [];
      for (const id of currentIds) {
        if (!prevTabIds.current.has(id)) added.push(id);
      }
      for (const id of prevTabIds.current) {
        if (!currentIds.has(id)) removed.push(id);
      }
      if (added.length === 1 && removed.length === 1) {
        const oldId = removed[0];
        const newId = added[0];
        if (fileContents[oldId] !== undefined || loadedFiles.current.has(oldId)) {
          setFileContents((prev) => {
            const next = { ...prev };
            if (oldId in next) {
              next[newId] = next[oldId];
              delete next[oldId];
            }
            return next;
          });
          if (originalContents.current[oldId] !== undefined) {
            originalContents.current[newId] = originalContents.current[oldId];
            delete originalContents.current[oldId];
          }
          loadedFiles.current.delete(oldId);
          loadedFiles.current.add(newId);
        }
      }
    }
    prevTabIds.current = currentIds;
  }, [openTabs, fileContents]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Track cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });
  };

  const handleContentChange = useCallback(
    (value: string | undefined) => {
      if (!activeTabId || isReadOnly) return;
      const newVal = value ?? '';
      setFileContents((prev) => ({ ...prev, [activeTabId]: newVal }));

      // Compare with original to decide unsaved state
      if (newVal !== originalContents.current[activeTabId]) {
        markUnsaved(activeTabId);
      }
    },
    [activeTabId, isReadOnly, markUnsaved],
  );

  const handleSaveAll = useCallback(async () => {
    if (!hasUnsavedFiles() || isReadOnly) return;

    const unsaved = Array.from(unsavedFiles);
    const filesToSave = unsaved.map((filePath) => ({
      path: filePath,
      content: fileContents[filePath] ?? '',
    }));

    setSaving(true);
    try {
      await apiClient.post(`/pages/${pageId}/container/files/batch-save`, {
        files: filesToSave,
      });

      // Update originals
      for (const file of filesToSave) {
        originalContents.current[file.path] = file.content;
      }
      clearAllUnsaved();
    } catch {
      console.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, [hasUnsavedFiles, isReadOnly, unsavedFiles, fileContents, pageId, clearAllUnsaved]);

  useImperativeHandle(ref, () => ({ saveAll: handleSaveAll }), [handleSaveAll]);


  // DiffBanner: apply a code suggestion into the editor buffer
  const handleApplySuggestion = useCallback(
    (suggestion: CodeSuggestion) => {
      const targetPath = suggestion.filePath;

      // Determine new content: apply diff to current content, or use content field directly
      let newContent: string;
      if (suggestion.diff) {
        const currentContent = fileContents[targetPath] ?? originalContents.current[targetPath] ?? '';
        const applied = applyUnifiedDiff(currentContent, suggestion.diff);
        newContent = applied ?? (suggestion.content || currentContent);
      } else {
        newContent = suggestion.content || '';
      }

      setFileContents((prev) => ({ ...prev, [targetPath]: newContent }));
      markUnsaved(targetPath);

      // If the suggestion targets the currently active file, update the editor
      if (editorRef.current && activeTabId === targetPath) {
        editorRef.current.setValue(newContent);
      }

      onSuggestionHandled?.();
    },
    [activeTabId, fileContents, markUnsaved, onSuggestionHandled],
  );

  const handleDismissSuggestion = useCallback(() => {
    onSuggestionHandled?.();
  }, [onSuggestionHandled]);

  if (openTabs.length === 0) {
    return (
      <div className="ed-empty">
        选择文件以开始编辑
      </div>
    );
  }

  return (
    <div className="ide-editor">
      {/* Diff Banner */}
      {pendingSuggestion && (
        <DiffBanner
          suggestion={pendingSuggestion}
          onApply={handleApplySuggestion}
          onDismiss={handleDismissSuggestion}
        />
      )}

      {/* Editor */}
      <div className="ed-wrap">
        {loadingFile ? (
          <div className="ed-empty">
            <span style={{ color: 'var(--t2)', fontSize: 13 }}>加载中...</span>
          </div>
        ) : activeTab ? (
          <MonacoEditor
            key={activeTab.id + (isReadOnly ? ':ro' : ':rw')}
            height="100%"
            language={activeTab.language}
            value={fileContents[activeTab.id] ?? ''}
            theme="vs-dark"
            onChange={handleContentChange}
            onMount={handleEditorMount}
            options={{
              readOnly: isReadOnly,
              fontSize: 14,
              tabSize: 2,
              lineNumbers: 'on',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
            }}
          />
        ) : null}
      </div>
    </div>
  );
});

export default Editor;
