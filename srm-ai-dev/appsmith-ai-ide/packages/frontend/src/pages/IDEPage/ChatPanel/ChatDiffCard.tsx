import React, { useState, useMemo } from 'react';

export interface DiffSuggestion {
  filePath: string;
  oldContent: string;
  newContent: string;
}

interface ChatDiffCardProps {
  suggestion: DiffSuggestion;
  onApply: (suggestion: DiffSuggestion) => Promise<void>;
}

interface DiffLine {
  type: 'add' | 'remove' | 'context';
  lineNum: number | null;   // line number in the relevant side
  text: string;
}

/**
 * Compute a simple line-by-line diff between old and new content.
 * Returns only changed regions with surrounding context lines.
 */
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const CONTEXT = 2; // context lines around changes

  // LCS-based diff is complex; use simple sequential comparison
  // Mark lines as matched, added, or removed
  const result: DiffLine[] = [];
  const rawDiff: Array<{ type: 'same' | 'add' | 'remove'; text: string; oldIdx?: number; newIdx?: number }> = [];

  let oi = 0;
  let ni = 0;

  // Simple O(n) diff: walk both arrays, match identical lines
  while (oi < oldLines.length && ni < newLines.length) {
    if (oldLines[oi] === newLines[ni]) {
      rawDiff.push({ type: 'same', text: oldLines[oi]!, oldIdx: oi, newIdx: ni });
      oi++;
      ni++;
    } else {
      // Look ahead in new for current old line
      let foundInNew = -1;
      for (let j = ni + 1; j < Math.min(ni + 10, newLines.length); j++) {
        if (newLines[j] === oldLines[oi]) { foundInNew = j; break; }
      }
      // Look ahead in old for current new line
      let foundInOld = -1;
      for (let j = oi + 1; j < Math.min(oi + 10, oldLines.length); j++) {
        if (oldLines[j] === newLines[ni]) { foundInOld = j; break; }
      }

      if (foundInNew >= 0 && (foundInOld < 0 || (foundInNew - ni) <= (foundInOld - oi))) {
        // Lines were added in new
        for (let j = ni; j < foundInNew; j++) {
          rawDiff.push({ type: 'add', text: newLines[j]!, newIdx: j });
        }
        ni = foundInNew;
      } else if (foundInOld >= 0) {
        // Lines were removed from old
        for (let j = oi; j < foundInOld; j++) {
          rawDiff.push({ type: 'remove', text: oldLines[j]!, oldIdx: j });
        }
        oi = foundInOld;
      } else {
        // Replace: old line removed, new line added
        rawDiff.push({ type: 'remove', text: oldLines[oi]!, oldIdx: oi });
        rawDiff.push({ type: 'add', text: newLines[ni]!, newIdx: ni });
        oi++;
        ni++;
      }
    }
  }

  // Remaining old lines
  while (oi < oldLines.length) {
    rawDiff.push({ type: 'remove', text: oldLines[oi]!, oldIdx: oi });
    oi++;
  }
  // Remaining new lines
  while (ni < newLines.length) {
    rawDiff.push({ type: 'add', text: newLines[ni]!, newIdx: ni });
    ni++;
  }

  // Filter to only show changed regions with context
  const isChanged = rawDiff.map((d) => d.type !== 'same');
  const visible = new Set<number>();

  for (let i = 0; i < rawDiff.length; i++) {
    if (isChanged[i]) {
      for (let j = Math.max(0, i - CONTEXT); j <= Math.min(rawDiff.length - 1, i + CONTEXT); j++) {
        visible.add(j);
      }
    }
  }

  let lastVisible = -1;
  for (let i = 0; i < rawDiff.length; i++) {
    if (!visible.has(i)) continue;

    // Insert separator if there's a gap
    if (lastVisible >= 0 && i - lastVisible > 1) {
      result.push({ type: 'context', lineNum: null, text: '···' });
    }
    lastVisible = i;

    const d = rawDiff[i]!;
    if (d.type === 'same') {
      result.push({ type: 'context', lineNum: (d.newIdx ?? 0) + 1, text: d.text });
    } else if (d.type === 'add') {
      result.push({ type: 'add', lineNum: (d.newIdx ?? 0) + 1, text: d.text });
    } else {
      result.push({ type: 'remove', lineNum: (d.oldIdx ?? 0) + 1, text: d.text });
    }
  }

  return result;
}

const ChatDiffCard: React.FC<ChatDiffCardProps> = ({ suggestion, onApply }) => {
  const [status, setStatus] = useState<'pending' | 'applying' | 'applied' | 'dismissed'>('pending');

  const diffLines = useMemo(
    () => computeDiff(suggestion.oldContent, suggestion.newContent),
    [suggestion.oldContent, suggestion.newContent],
  );

  const isNewFile = !suggestion.oldContent;
  const addCount = diffLines.filter((l) => l.type === 'add').length;
  const removeCount = diffLines.filter((l) => l.type === 'remove').length;

  const handleApply = async () => {
    setStatus('applying');
    try {
      await onApply(suggestion);
      setStatus('applied');
    } catch {
      setStatus('pending');
    }
  };

  const handleDismiss = () => {
    setStatus('dismissed');
  };

  return (
    <div className="diff-card">
      <div className="diff-card-header">
        <span className="diff-card-file">{suggestion.filePath}</span>
        <span className="diff-card-stats">
          {isNewFile ? (
            <span className="diff-stat-add">新建文件</span>
          ) : (
            <>
              {addCount > 0 && <span className="diff-stat-add">+{addCount}</span>}
              {removeCount > 0 && <span className="diff-stat-remove">-{removeCount}</span>}
            </>
          )}
        </span>
      </div>

      <div className="diff-card-body">
        {diffLines.map((line, idx) => (
          <div
            key={idx}
            className={`diff-line diff-line-${line.type}`}
          >
            <span className="diff-line-num">
              {line.lineNum ?? ''}
            </span>
            <span className="diff-line-sign">
              {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
            </span>
            <span className="diff-line-text">{line.text || ' '}</span>
          </div>
        ))}
      </div>

      <div className="diff-card-actions">
        {status === 'pending' && (
          <>
            <button className="btn btn-p btn-sm" onClick={handleApply}>
              应用修改
            </button>
            <button className="btn btn-grey btn-sm" onClick={handleDismiss}>
              取消
            </button>
          </>
        )}
        {status === 'applying' && (
          <span style={{ fontSize: 12, color: 'var(--t2)' }}>应用中...</span>
        )}
        {status === 'applied' && (
          <span style={{ fontSize: 12, color: 'var(--grn)' }}>已应用</span>
        )}
        {status === 'dismissed' && (
          <span style={{ fontSize: 12, color: 'var(--t3)' }}>已取消</span>
        )}
      </div>
    </div>
  );
};

export default ChatDiffCard;
