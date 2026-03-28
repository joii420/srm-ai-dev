/**
 * Apply a unified diff to the original file content.
 *
 * Supports standard unified diff format:
 *   --- a/file
 *   +++ b/file
 *   @@ -startOld,countOld +startNew,countNew @@
 *    context line
 *   -removed line
 *   +added line
 *
 * If the diff cannot be parsed or applied, returns null.
 */
export function applyUnifiedDiff(
  original: string,
  diff: string,
): string | null {
  const originalLines = original.split('\n');
  const diffLines = diff.split('\n');

  // Parse hunks from the diff
  const hunks: Array<{
    oldStart: number;
    oldCount: number;
    changes: Array<{ type: 'context' | 'add' | 'remove'; line: string }>;
  }> = [];

  let i = 0;

  // Skip header lines (--- and +++)
  while (i < diffLines.length) {
    const line = diffLines[i];
    if (line.startsWith('@@')) break;
    i++;
  }

  // Parse each hunk
  while (i < diffLines.length) {
    const hunkHeader = diffLines[i];
    const match = hunkHeader.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (!match) {
      i++;
      continue;
    }

    const oldStart = parseInt(match[1], 10);
    const oldCount = match[2] !== undefined ? parseInt(match[2], 10) : 1;
    i++;

    const changes: Array<{ type: 'context' | 'add' | 'remove'; line: string }> = [];

    while (i < diffLines.length && !diffLines[i].startsWith('@@')) {
      const dLine = diffLines[i];
      if (dLine.startsWith('+')) {
        changes.push({ type: 'add', line: dLine.slice(1) });
      } else if (dLine.startsWith('-')) {
        changes.push({ type: 'remove', line: dLine.slice(1) });
      } else if (dLine.startsWith(' ')) {
        changes.push({ type: 'context', line: dLine.slice(1) });
      } else if (dLine === '') {
        // Empty line in diff = context empty line
        changes.push({ type: 'context', line: '' });
      } else {
        // No-newline-at-end-of-file marker or unknown line, skip
      }
      i++;
    }

    hunks.push({ oldStart, oldCount, changes });
  }

  if (hunks.length === 0) {
    return null;
  }

  // Apply hunks in reverse order to preserve line numbers
  const result = [...originalLines];
  const sortedHunks = [...hunks].sort((a, b) => b.oldStart - a.oldStart);

  for (const hunk of sortedHunks) {
    // oldStart is 1-based
    const startIdx = hunk.oldStart - 1;

    // Build the new lines for this hunk
    const newLines: string[] = [];
    let removeCount = 0;

    for (const change of hunk.changes) {
      if (change.type === 'context') {
        newLines.push(change.line);
        removeCount++;
      } else if (change.type === 'add') {
        newLines.push(change.line);
      } else if (change.type === 'remove') {
        removeCount++;
      }
    }

    // Replace the old lines with new lines
    result.splice(startIdx, removeCount, ...newLines);
  }

  return result.join('\n');
}
