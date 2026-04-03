import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useEditorStore } from '../../stores/editorStore';

/**
 * Derive a display language from a file extension.
 */
function languageFromExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    js: 'JavaScript',
    jsx: 'JavaScript JSX',
    ts: 'TypeScript',
    tsx: 'TypeScript JSX',
    json: 'JSON',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    less: 'Less',
    md: 'Markdown',
    yaml: 'YAML',
    yml: 'YAML',
    py: 'Python',
    java: 'Java',
    go: 'Go',
    rs: 'Rust',
    sql: 'SQL',
    sh: 'Shell',
    xml: 'XML',
    vue: 'Vue',
    svelte: 'Svelte',
  };
  return map[ext] ?? (ext.toUpperCase() || 'Plain Text');
}

export const StatusBar: React.FC = () => {
  const location = useLocation();
  const { userInfo } = useAuthStore();
  const { openTabs, activeTabId, unsavedFiles, cursorPosition } = useEditorStore();

  const isIDEPage = location.pathname.startsWith('/ide/');

  if (!isIDEPage) {
    return (
      <footer className="statusbar">
        <span>{userInfo?.displayName ?? userInfo?.username ?? ''}</span>
      </footer>
    );
  }

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const changedCount = unsavedFiles.size;
  const line = cursorPosition?.line ?? 1;
  const column = cursorPosition?.column ?? 1;
  const language = activeTab ? languageFromExtension(activeTab.fileName) : '';
  const branch = 'dev';

  return (
    <footer className="statusbar">
      <span>{activeTab ? activeTab.fileName : ''}</span>
      <span>
        <BranchIcon /> {branch}
      </span>
      {activeTab && (
        <span>
          Ln {line}, Col {column}
        </span>
      )}
      {language && <span>{language}</span>}
      <span>UTF-8</span>
      <div className="sb-r">
        {changedCount > 0 && (
          <span style={{ color: 'rgba(255,255,255,.95)' }}>
            {changedCount} unsaved
          </span>
        )}
        <span>{userInfo?.displayName ?? userInfo?.username ?? ''}</span>
      </div>
    </footer>
  );
};

/* Tiny inline SVG branch icon */
const BranchIcon: React.FC = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 16 16"
    fill="currentColor"
    style={{ verticalAlign: 'middle', marginRight: 2 }}
  >
    <path d="M11.75 2.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5zm-2.116 3.276a2.25 2.25 0 1 1 .678-1.39A3.001 3.001 0 0 1 13 7.25v.5A2.25 2.25 0 0 1 10.75 10H6.5a.75.75 0 0 0-.75.75v1a2.25 2.25 0 1 1-1.5 0v-1A2.25 2.25 0 0 1 6.5 8.5h4.25a.75.75 0 0 0 .75-.75v-.5a1.5 1.5 0 0 0-1.866-1.474zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM4.25 2.5a.75.75 0 0 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 6v-.75A2.25 2.25 0 1 1 5 2.75v.75a2.25 2.25 0 0 1-1.5 2.5z" />
  </svg>
);
