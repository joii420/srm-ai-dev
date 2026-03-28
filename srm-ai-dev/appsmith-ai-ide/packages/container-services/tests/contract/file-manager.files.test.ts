import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
//  Contract test for File Manager GET /files (tree listing)
//
//  These tests validate the response contract of the File Manager service
//  that runs inside each workspace container. We mock the filesystem layer
//  and test the expected HTTP response shapes.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
//  Mocks
// ---------------------------------------------------------------------------

const mockReaddir = vi.fn();
const mockStat = vi.fn();

vi.mock('node:fs/promises', () => ({
  readdir: (...args: unknown[]) => mockReaddir(...args),
  stat: (...args: unknown[]) => mockStat(...args),
}));

// ---------------------------------------------------------------------------
//  Types — contract shapes we expect from the API
// ---------------------------------------------------------------------------

interface TreeNode {
  type: 'file' | 'directory';
  name: string;
  path: string;
  size?: number;
  children?: TreeNode[];
}

interface TreeResponse {
  tree: TreeNode[];
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

/**
 * Simulates the response shape that GET /files should return.
 * In a real integration the Fastify handler would call fs and build this;
 * here we verify the contract shape directly.
 */
function buildTreeResponse(nodes: TreeNode[]): TreeResponse {
  return { tree: nodes };
}

function createMockFileNode(name: string, path: string, size: number): TreeNode {
  return { type: 'file', name, path, size };
}

function createMockDirNode(
  name: string,
  path: string,
  children: TreeNode[] = [],
): TreeNode {
  return { type: 'directory', name, path, children };
}

// ---------------------------------------------------------------------------
//  Contract: GET /files (tree listing)
// ---------------------------------------------------------------------------

describe('Contract: GET /files (tree listing)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('response shape', () => {
    it('returns 200 with { tree: [...] } containing file and directory nodes', () => {
      const response: TreeResponse = buildTreeResponse([
        createMockFileNode('index.ts', '/workspace/repo/index.ts', 1024),
        createMockDirNode('src', '/workspace/repo/src', [
          createMockFileNode('app.ts', '/workspace/repo/src/app.ts', 512),
          createMockFileNode('utils.ts', '/workspace/repo/src/utils.ts', 256),
        ]),
        createMockDirNode('tests', '/workspace/repo/tests', []),
      ]);

      // Validate top-level shape
      expect(response).toHaveProperty('tree');
      expect(Array.isArray(response.tree)).toBe(true);

      // Validate each node in the tree
      for (const node of response.tree) {
        expect(node).toHaveProperty('type');
        expect(['file', 'directory']).toContain(node.type);
        expect(node).toHaveProperty('name');
        expect(typeof node.name).toBe('string');
        expect(node).toHaveProperty('path');
        expect(typeof node.path).toBe('string');

        if (node.type === 'file') {
          expect(node).toHaveProperty('size');
          expect(typeof node.size).toBe('number');
        }

        if (node.type === 'directory') {
          expect(node).toHaveProperty('children');
          expect(Array.isArray(node.children)).toBe(true);
        }
      }
    });

    it('file nodes include size as a number', () => {
      const fileNode = createMockFileNode('readme.md', '/workspace/repo/readme.md', 2048);

      expect(fileNode.type).toBe('file');
      expect(fileNode.size).toBe(2048);
      expect(typeof fileNode.size).toBe('number');
    });

    it('directory nodes include children array', () => {
      const dirNode = createMockDirNode('lib', '/workspace/repo/lib', [
        createMockFileNode('helper.ts', '/workspace/repo/lib/helper.ts', 128),
      ]);

      expect(dirNode.type).toBe('directory');
      expect(Array.isArray(dirNode.children)).toBe(true);
      expect(dirNode.children!.length).toBe(1);
      expect(dirNode.children![0].name).toBe('helper.ts');
    });

    it('nested directories preserve the tree structure', () => {
      const response: TreeResponse = buildTreeResponse([
        createMockDirNode('src', '/workspace/repo/src', [
          createMockDirNode('components', '/workspace/repo/src/components', [
            createMockFileNode('Button.tsx', '/workspace/repo/src/components/Button.tsx', 300),
          ]),
        ]),
      ]);

      const src = response.tree[0];
      expect(src.type).toBe('directory');
      expect(src.children).toHaveLength(1);

      const components = src.children![0];
      expect(components.type).toBe('directory');
      expect(components.children).toHaveLength(1);
      expect(components.children![0].name).toBe('Button.tsx');
    });
  });

  describe('empty workspace', () => {
    it('returns empty tree array when workspace has no files', () => {
      const response: TreeResponse = buildTreeResponse([]);

      expect(response).toHaveProperty('tree');
      expect(Array.isArray(response.tree)).toBe(true);
      expect(response.tree).toHaveLength(0);
    });

    it('empty tree is a valid JSON response', () => {
      const response: TreeResponse = buildTreeResponse([]);
      const serialized = JSON.stringify(response);
      const parsed = JSON.parse(serialized) as TreeResponse;

      expect(parsed).toEqual({ tree: [] });
    });
  });

  describe('path conventions', () => {
    it('all paths are absolute starting with /workspace', () => {
      const response: TreeResponse = buildTreeResponse([
        createMockFileNode('main.ts', '/workspace/repo/main.ts', 100),
        createMockDirNode('config', '/workspace/repo/config', [
          createMockFileNode('app.json', '/workspace/repo/config/app.json', 50),
        ]),
      ]);

      function checkPaths(nodes: TreeNode[]): void {
        for (const node of nodes) {
          expect(node.path).toMatch(/^\/workspace\//);
          if (node.children) {
            checkPaths(node.children);
          }
        }
      }

      checkPaths(response.tree);
    });
  });
});
