import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const WORKSPACE_DIR = process.env["WORKSPACE_DIR"] ?? "/workspace";

export interface FileTreeNode {
  type: "file" | "directory";
  name: string;
  path: string;
  size?: number;
  children?: FileTreeNode[];
}

export interface FileContent {
  path: string;
  content: string;
  encoding: "utf-8";
  size: number;
}

export interface BatchSaveResult {
  saved: number;
  results: Array<{ path: string; success: boolean; error?: string }>;
}

export interface DiffResult {
  diff: string;
  changedFiles: number;
}

function resolveWorkspacePath(filePath: string): string {
  const resolved = path.resolve(WORKSPACE_DIR, filePath);
  const normalizedResolved = path.normalize(resolved);
  const normalizedBase = path.normalize(WORKSPACE_DIR);

  if (
    !normalizedResolved.startsWith(normalizedBase + path.sep) &&
    normalizedResolved !== normalizedBase
  ) {
    throw new Error(
      `Path traversal detected: "${filePath}" resolves outside workspace`
    );
  }

  return resolved;
}

export async function readDir(dir?: string): Promise<FileTreeNode[]> {
  const targetDir = dir ? resolveWorkspacePath(dir) : WORKSPACE_DIR;

  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  const tree: FileTreeNode[] = [];

  for (const entry of entries) {
    // Skip hidden files/dirs like .git
    if (entry.name.startsWith(".")) continue;

    const entryPath = path.join(targetDir, entry.name);
    const relativePath = path.relative(WORKSPACE_DIR, entryPath);

    if (entry.isDirectory()) {
      const children = await readDir(relativePath);
      tree.push({
        type: "directory",
        name: entry.name,
        path: relativePath,
        children,
      });
    } else if (entry.isFile()) {
      const stat = await fs.stat(entryPath);
      tree.push({
        type: "file",
        name: entry.name,
        path: relativePath,
        size: stat.size,
      });
    }
  }

  return tree;
}

export async function readFile(filePath: string): Promise<FileContent> {
  const resolved = resolveWorkspacePath(filePath);

  const stat = await fs.stat(resolved);
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }

  const content = await fs.readFile(resolved, "utf-8");

  return {
    path: filePath,
    content,
    encoding: "utf-8",
    size: stat.size,
  };
}

export async function writeFile(
  filePath: string,
  content: string
): Promise<void> {
  const resolved = resolveWorkspacePath(filePath);

  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, "utf-8");
}

export async function deleteFile(filePath: string): Promise<void> {
  const resolved = resolveWorkspacePath(filePath);

  const stat = await fs.stat(resolved);
  if (stat.isDirectory()) {
    await fs.rm(resolved, { recursive: true });
  } else {
    await fs.unlink(resolved);
  }
}

export async function batchSave(
  files: Array<{ path: string; content: string }>
): Promise<BatchSaveResult> {
  const results: BatchSaveResult["results"] = [];
  let saved = 0;

  for (const file of files) {
    try {
      await writeFile(file.path, file.content);
      results.push({ path: file.path, success: true });
      saved++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ path: file.path, success: false, error: message });
    }
  }

  return { saved, results };
}

export async function getDiff(): Promise<DiffResult> {
  try {
    const { stdout } = await execAsync("git diff", { cwd: WORKSPACE_DIR });
    const changedFiles = stdout
      ? stdout
          .split("\n")
          .filter((line) => line.startsWith("diff --git")).length
      : 0;

    return { diff: stdout, changedFiles };
  } catch {
    return { diff: "", changedFiles: 0 };
  }
}

/* ------------------------------------------------------------------ */
/*  Changed files with content                                        */
/* ------------------------------------------------------------------ */

export interface ChangedFileEntry {
  /** Relative path within workspace */
  path: string;
  /** git status code: M=modified, A=added (new), D=deleted, R=renamed, ?=untracked */
  status: string;
  /** File content (utf-8). Null for deleted files. */
  content: string | null;
}

export interface ChangedFilesResult {
  files: ChangedFileEntry[];
}

/**
 * Collect all changed files (tracked + untracked) with their current content.
 * Uses `git status --porcelain` to detect changes, then reads each file.
 */
export async function getChangedFiles(): Promise<ChangedFilesResult> {
  const files: ChangedFileEntry[] = [];

  try {
    // --porcelain gives stable, parseable output
    // Includes staged, unstaged, and untracked files
    const { stdout } = await execAsync("git status --porcelain", {
      cwd: WORKSPACE_DIR,
    });

    if (!stdout.trim()) {
      return { files };
    }

    const lines = stdout.trim().split("\n");

    for (const line of lines) {
      // Format: "XY path" or "XY old -> new" (for renames)
      // X = index status, Y = worktree status
      const statusCode = line.substring(0, 2).trim();
      let filePath = line.substring(3);

      // Handle renames: "R  old -> new"
      if (filePath.includes(" -> ")) {
        filePath = filePath.split(" -> ")[1];
      }

      // Skip .git internal files
      if (filePath.startsWith(".git/")) continue;

      let content: string | null = null;

      if (statusCode === "D") {
        // Deleted file — no content to read
        content = null;
      } else {
        try {
          const resolved = resolveWorkspacePath(filePath);
          content = await fs.readFile(resolved, "utf-8");
        } catch {
          // File might not be readable (binary, missing, etc.)
          content = null;
        }
      }

      files.push({ path: filePath, status: statusCode, content });
    }
  } catch {
    // git not available or not a repo — return empty
  }

  return { files };
}
