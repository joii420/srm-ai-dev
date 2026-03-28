import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
//  Unit test for AI Proxy context builder
//
//  The context builder is responsible for assembling the full prompt context
//  by reading:
//    1. Workspace files from /workspace directory
//    2. Dependencies from /deps directory
//    3. Activated skill prompts from /skills/skills.json
//  And combining them into a single prompt string.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
//  Mocks
// ---------------------------------------------------------------------------

const mockReaddir = vi.fn();
const mockReadFile = vi.fn();
const mockStat = vi.fn();
const mockAccess = vi.fn();

vi.mock('node:fs/promises', () => ({
  readdir: (...args: unknown[]) => mockReaddir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
  stat: (...args: unknown[]) => mockStat(...args),
  access: (...args: unknown[]) => mockAccess(...args),
}));

// ---------------------------------------------------------------------------
//  Context builder implementation (inline for unit testing)
// ---------------------------------------------------------------------------

import { readdir, readFile, stat, access } from 'node:fs/promises';

interface SkillDefinition {
  id: string;
  name: string;
  prompt: string;
}

interface ContextParts {
  workspaceContext: string;
  depsContext: string;
  skillsContext: string;
}

/**
 * Read workspace files from /workspace directory and build context.
 */
async function readWorkspaceFiles(workspaceDir: string): Promise<string> {
  try {
    const entries = await readdir(workspaceDir, { withFileTypes: true });
    const fileContents: string[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = `${workspaceDir}/${entry.name}`;
        const content = await readFile(filePath, 'utf-8');
        fileContents.push(`--- ${entry.name} ---\n${content}`);
      }
    }

    return fileContents.join('\n\n');
  } catch {
    return '';
  }
}

/**
 * Read dependency context from /deps directory.
 */
async function readDepsContext(depsDir: string): Promise<string> {
  try {
    const entries = await readdir(depsDir, { withFileTypes: true });
    const depParts: string[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = `${depsDir}/${entry.name}`;
        const content = await readFile(filePath, 'utf-8');
        depParts.push(`[dep: ${entry.name}]\n${content}`);
      }
    }

    return depParts.join('\n\n');
  } catch {
    return '';
  }
}

/**
 * Read activated skill prompts from /skills/skills.json.
 */
async function readSkillPrompts(
  skillsPath: string,
  activatedSkillIds: string[],
): Promise<string> {
  try {
    const raw = await readFile(skillsPath, 'utf-8');
    const skills: SkillDefinition[] = JSON.parse(raw);

    const activated = skills.filter((s) => activatedSkillIds.includes(s.id));
    if (activated.length === 0) return '';

    return activated
      .map((s) => `[Skill: ${s.name}]\n${s.prompt}`)
      .join('\n\n');
  } catch {
    return '';
  }
}

/**
 * Combine all context parts into a single prompt.
 */
function buildFullContext(parts: ContextParts): string {
  const sections: string[] = [];

  if (parts.workspaceContext) {
    sections.push(`## Workspace Files\n\n${parts.workspaceContext}`);
  }

  if (parts.depsContext) {
    sections.push(`## Dependencies\n\n${parts.depsContext}`);
  }

  if (parts.skillsContext) {
    sections.push(`## Active Skills\n\n${parts.skillsContext}`);
  }

  return sections.join('\n\n---\n\n');
}

// ---------------------------------------------------------------------------
//  Tests
// ---------------------------------------------------------------------------

describe('Context builder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  //  Workspace files
  // -----------------------------------------------------------------------

  describe('reads workspace files from /workspace directory', () => {
    it('reads all files in the workspace directory', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'index.ts', isFile: () => true, isDirectory: () => false },
        { name: 'utils.ts', isFile: () => true, isDirectory: () => false },
      ]);

      mockReadFile.mockImplementation(async (path: string) => {
        if (path.includes('index.ts')) return 'export const main = true;';
        if (path.includes('utils.ts')) return 'export function noop() {}';
        return '';
      });

      const result = await readWorkspaceFiles('/workspace');

      expect(mockReaddir).toHaveBeenCalledWith('/workspace', { withFileTypes: true });
      expect(mockReadFile).toHaveBeenCalledTimes(2);
      expect(result).toContain('--- index.ts ---');
      expect(result).toContain('export const main = true;');
      expect(result).toContain('--- utils.ts ---');
      expect(result).toContain('export function noop() {}');
    });

    it('returns empty string when workspace directory is empty', async () => {
      mockReaddir.mockResolvedValue([]);

      const result = await readWorkspaceFiles('/workspace');

      expect(result).toBe('');
    });

    it('skips directories, only reads files', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'src', isFile: () => false, isDirectory: () => true },
        { name: 'app.ts', isFile: () => true, isDirectory: () => false },
      ]);

      mockReadFile.mockResolvedValue('const app = {};');

      const result = await readWorkspaceFiles('/workspace');

      expect(mockReadFile).toHaveBeenCalledTimes(1);
      expect(result).toContain('--- app.ts ---');
      expect(result).not.toContain('src');
    });

    it('returns empty string if directory does not exist', async () => {
      mockReaddir.mockRejectedValue(new Error('ENOENT'));

      const result = await readWorkspaceFiles('/workspace');

      expect(result).toBe('');
    });
  });

  // -----------------------------------------------------------------------
  //  Dependencies
  // -----------------------------------------------------------------------

  describe('injects deps from /deps directory', () => {
    it('reads dependency files from the deps directory', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'react-docs.txt', isFile: () => true, isDirectory: () => false },
        { name: 'api-spec.json', isFile: () => true, isDirectory: () => false },
      ]);

      mockReadFile.mockImplementation(async (path: string) => {
        if (path.includes('react-docs.txt')) return 'React documentation content';
        if (path.includes('api-spec.json')) return '{"openapi":"3.0.0"}';
        return '';
      });

      const result = await readDepsContext('/deps');

      expect(mockReaddir).toHaveBeenCalledWith('/deps', { withFileTypes: true });
      expect(result).toContain('[dep: react-docs.txt]');
      expect(result).toContain('React documentation content');
      expect(result).toContain('[dep: api-spec.json]');
    });

    it('returns empty string when no deps exist', async () => {
      mockReaddir.mockResolvedValue([]);

      const result = await readDepsContext('/deps');

      expect(result).toBe('');
    });

    it('returns empty string if deps directory does not exist', async () => {
      mockReaddir.mockRejectedValue(new Error('ENOENT'));

      const result = await readDepsContext('/deps');

      expect(result).toBe('');
    });
  });

  // -----------------------------------------------------------------------
  //  Skills
  // -----------------------------------------------------------------------

  describe('injects activated skill prompts from /skills/skills.json', () => {
    const mockSkills: SkillDefinition[] = [
      { id: 'skill-react', name: 'React Expert', prompt: 'You are a React expert.' },
      { id: 'skill-ts', name: 'TypeScript Helper', prompt: 'You help with TypeScript.' },
      { id: 'skill-css', name: 'CSS Wizard', prompt: 'You are a CSS wizard.' },
    ];

    it('reads and filters skills by activated IDs', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockSkills));

      const result = await readSkillPrompts('/skills/skills.json', [
        'skill-react',
        'skill-ts',
      ]);

      expect(mockReadFile).toHaveBeenCalledWith('/skills/skills.json', 'utf-8');
      expect(result).toContain('[Skill: React Expert]');
      expect(result).toContain('You are a React expert.');
      expect(result).toContain('[Skill: TypeScript Helper]');
      expect(result).toContain('You help with TypeScript.');
      expect(result).not.toContain('CSS Wizard');
    });

    it('returns empty string when no skills are activated', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockSkills));

      const result = await readSkillPrompts('/skills/skills.json', []);

      expect(result).toBe('');
    });

    it('returns empty string when skills.json does not exist', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      const result = await readSkillPrompts('/skills/skills.json', ['skill-react']);

      expect(result).toBe('');
    });

    it('returns empty string when skills.json is invalid JSON', async () => {
      mockReadFile.mockResolvedValue('not valid json');

      const result = await readSkillPrompts('/skills/skills.json', ['skill-react']);

      expect(result).toBe('');
    });

    it('ignores skill IDs that do not exist in skills.json', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockSkills));

      const result = await readSkillPrompts('/skills/skills.json', [
        'skill-nonexistent',
      ]);

      expect(result).toBe('');
    });
  });

  // -----------------------------------------------------------------------
  //  Combined context
  // -----------------------------------------------------------------------

  describe('combines all context into a single prompt', () => {
    it('joins workspace, deps, and skills into sections', () => {
      const parts: ContextParts = {
        workspaceContext: '--- index.ts ---\nconst x = 1;',
        depsContext: '[dep: api.txt]\nAPI docs here',
        skillsContext: '[Skill: React Expert]\nYou are a React expert.',
      };

      const result = buildFullContext(parts);

      expect(result).toContain('## Workspace Files');
      expect(result).toContain('const x = 1;');
      expect(result).toContain('## Dependencies');
      expect(result).toContain('API docs here');
      expect(result).toContain('## Active Skills');
      expect(result).toContain('You are a React expert.');
    });

    it('omits empty sections', () => {
      const parts: ContextParts = {
        workspaceContext: '--- app.ts ---\nconst app = {};',
        depsContext: '',
        skillsContext: '',
      };

      const result = buildFullContext(parts);

      expect(result).toContain('## Workspace Files');
      expect(result).not.toContain('## Dependencies');
      expect(result).not.toContain('## Active Skills');
    });

    it('returns empty string when all parts are empty', () => {
      const parts: ContextParts = {
        workspaceContext: '',
        depsContext: '',
        skillsContext: '',
      };

      const result = buildFullContext(parts);

      expect(result).toBe('');
    });

    it('sections are separated by horizontal rules', () => {
      const parts: ContextParts = {
        workspaceContext: 'workspace content',
        depsContext: 'deps content',
        skillsContext: 'skills content',
      };

      const result = buildFullContext(parts);

      // Sections separated by ---
      const sections = result.split('---');
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });
  });
});
