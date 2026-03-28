import React from 'react';
import type { CodeSuggestion } from '../ChatPanel';

interface DiffBannerProps {
  suggestion: CodeSuggestion;
  onApply: (suggestion: CodeSuggestion) => void;
  onDismiss: () => void;
}

const DiffBanner: React.FC<DiffBannerProps> = ({
  suggestion,
  onApply,
  onDismiss,
}) => {
  const fileName = suggestion.filePath.split('/').pop() ?? suggestion.filePath;

  return (
    <div className="diff-notice">
      <div className="dn-info">
        <span className="dn-icon">&#9998;</span>
        <span className="dn-file">{fileName}</span>
        <span className="dn-hint">AI 建议修改此文件</span>
        {suggestion.diff && (
          <span className="dn-diff">
            {summarizeDiff(suggestion.diff)}
          </span>
        )}
      </div>
      <div className="dn-actions">
        <button className="btn btn-green" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => onApply(suggestion)}>
          应用修改
        </button>
        <button className="btn btn-grey" style={{ padding: '4px 12px', fontSize: 12, cursor: 'pointer' }} onClick={onDismiss}>
          忽略
        </button>
      </div>
    </div>
  );
};

/**
 * Produce a short summary from a unified diff string,
 * e.g. "+3 -1 lines".
 */
function summarizeDiff(diff: string): string {
  const lines = diff.split('\n');
  let added = 0;
  let removed = 0;
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) added++;
    if (line.startsWith('-') && !line.startsWith('---')) removed++;
  }
  return `+${added} -${removed} 行`;
}

export default DiffBanner;
