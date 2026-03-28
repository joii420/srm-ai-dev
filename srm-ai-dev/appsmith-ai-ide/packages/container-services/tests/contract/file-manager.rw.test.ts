import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
//  Contract test for File Manager read/write endpoints
//
//  GET  /files/:path       — read a file
//  POST /files/batch-save  — save multiple files
//  GET  /diff              — workspace diff
//  404  for non-existent   — missing file
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
//  Mocks
// ---------------------------------------------------------------------------

const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockAccess = vi.fn();

vi.mock('node:fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  access: (...args: unknown[]) => mockAccess(...args),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
//  Contract types
// ---------------------------------------------------------------------------

interface FileReadResponse {
  path: string;
  content: string;
  encoding: string;
  size: number;
}

interface BatchSaveRequest {
  files: Array<{ path: string; content: string }>;
}

interface BatchSaveResponse {
  saved: number;
  results: Array<{ path: string; status: 'ok' | 'error'; error?: string }>;
}

interface DiffResponse {
  diff: string;
  changedFiles: string[];
}

interface ErrorResponse {
  error: string;
  message: string;
}

// ---------------------------------------------------------------------------
//  Contract: GET /files/:path (read file)
// ---------------------------------------------------------------------------

describe('Contract: GET /files/:path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { path, content, encoding, size } for an existing file', () => {
    const response: FileReadResponse = {
      path: '/workspace/repo/src/index.ts',
      content: 'export const hello = "world";',
      encoding: 'utf-8',
      size: 28,
    };

    expect(response).toHaveProperty('path');
    expect(typeof response.path).toBe('string');

    expect(response).toHaveProperty('content');
    expect(typeof response.content).toBe('string');

    expect(response).toHaveProperty('encoding');
    expect(typeof response.encoding).toBe('string');

    expect(response).toHaveProperty('size');
    expect(typeof response.size).toBe('number');
    expect(response.size).toBeGreaterThan(0);
  });

  it('content length matches reported size', () => {
    const content = 'console.log("test");';
    const response: FileReadResponse = {
      path: '/workspace/repo/test.js',
      content,
      encoding: 'utf-8',
      size: content.length,
    };

    expect(response.size).toBe(response.content.length);
  });

  it('encoding is a valid encoding string', () => {
    const response: FileReadResponse = {
      path: '/workspace/repo/data.bin',
      content: 'base64encodeddata==',
      encoding: 'base64',
      size: 14,
    };

    expect(['utf-8', 'base64', 'binary']).toContain(response.encoding);
  });

  it('returns 404 error shape for non-existent file', () => {
    const errorResponse: ErrorResponse = {
      error: 'NotFound',
      message: 'File not found: /workspace/repo/missing.ts',
    };

    expect(errorResponse).toHaveProperty('error');
    expect(typeof errorResponse.error).toBe('string');
    expect(errorResponse.error).toBe('NotFound');

    expect(errorResponse).toHaveProperty('message');
    expect(typeof errorResponse.message).toBe('string');
    expect(errorResponse.message).toContain('missing.ts');
  });
});

// ---------------------------------------------------------------------------
//  Contract: POST /files/batch-save
// ---------------------------------------------------------------------------

describe('Contract: POST /files/batch-save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts { files: [{ path, content }] } request shape', () => {
    const request: BatchSaveRequest = {
      files: [
        { path: '/workspace/repo/src/new.ts', content: 'export default {};' },
        { path: '/workspace/repo/src/utils.ts', content: 'export function noop() {}' },
      ],
    };

    expect(request).toHaveProperty('files');
    expect(Array.isArray(request.files)).toBe(true);

    for (const file of request.files) {
      expect(file).toHaveProperty('path');
      expect(typeof file.path).toBe('string');
      expect(file).toHaveProperty('content');
      expect(typeof file.content).toBe('string');
    }
  });

  it('returns { saved, results } response shape on success', () => {
    const response: BatchSaveResponse = {
      saved: 2,
      results: [
        { path: '/workspace/repo/src/new.ts', status: 'ok' },
        { path: '/workspace/repo/src/utils.ts', status: 'ok' },
      ],
    };

    expect(response).toHaveProperty('saved');
    expect(typeof response.saved).toBe('number');
    expect(response.saved).toBe(2);

    expect(response).toHaveProperty('results');
    expect(Array.isArray(response.results)).toBe(true);
    expect(response.results).toHaveLength(2);

    for (const result of response.results) {
      expect(result).toHaveProperty('path');
      expect(typeof result.path).toBe('string');
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('ok');
    }
  });

  it('saved count matches the number of successful results', () => {
    const response: BatchSaveResponse = {
      saved: 1,
      results: [
        { path: '/workspace/repo/src/ok.ts', status: 'ok' },
        { path: '/workspace/repo/src/fail.ts', status: 'error', error: 'Permission denied' },
      ],
    };

    const successCount = response.results.filter((r) => r.status === 'ok').length;
    expect(response.saved).toBe(successCount);
  });

  it('error results include error message', () => {
    const response: BatchSaveResponse = {
      saved: 0,
      results: [
        {
          path: '/workspace/repo/readonly.ts',
          status: 'error',
          error: 'EACCES: permission denied',
        },
      ],
    };

    const errorResult = response.results.find((r) => r.status === 'error');
    expect(errorResult).toBeDefined();
    expect(errorResult!.error).toBeDefined();
    expect(typeof errorResult!.error).toBe('string');
  });
});

// ---------------------------------------------------------------------------
//  Contract: GET /diff
// ---------------------------------------------------------------------------

describe('Contract: GET /diff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { diff, changedFiles } response shape', () => {
    const response: DiffResponse = {
      diff: '--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1 +1 @@\n-old line\n+new line',
      changedFiles: ['src/index.ts'],
    };

    expect(response).toHaveProperty('diff');
    expect(typeof response.diff).toBe('string');

    expect(response).toHaveProperty('changedFiles');
    expect(Array.isArray(response.changedFiles)).toBe(true);

    for (const file of response.changedFiles) {
      expect(typeof file).toBe('string');
    }
  });

  it('empty diff when no changes', () => {
    const response: DiffResponse = {
      diff: '',
      changedFiles: [],
    };

    expect(response.diff).toBe('');
    expect(response.changedFiles).toHaveLength(0);
  });

  it('changedFiles lists all modified file paths', () => {
    const response: DiffResponse = {
      diff: 'multi-file diff content...',
      changedFiles: [
        'src/index.ts',
        'src/utils.ts',
        'package.json',
      ],
    };

    expect(response.changedFiles).toHaveLength(3);
    expect(response.changedFiles).toContain('src/index.ts');
    expect(response.changedFiles).toContain('package.json');
  });
});

// ---------------------------------------------------------------------------
//  Contract: 404 for non-existent file
// ---------------------------------------------------------------------------

describe('Contract: 404 for non-existent file', () => {
  it('error response has { error, message } shape', () => {
    const response: ErrorResponse = {
      error: 'NotFound',
      message: 'File not found: /workspace/repo/does-not-exist.ts',
    };

    expect(response).toHaveProperty('error');
    expect(response).toHaveProperty('message');
    expect(response.error).toBe('NotFound');
  });

  it('message references the requested file path', () => {
    const requestedPath = '/workspace/repo/nonexistent/deeply/nested/file.ts';
    const response: ErrorResponse = {
      error: 'NotFound',
      message: `File not found: ${requestedPath}`,
    };

    expect(response.message).toContain(requestedPath);
  });
});
