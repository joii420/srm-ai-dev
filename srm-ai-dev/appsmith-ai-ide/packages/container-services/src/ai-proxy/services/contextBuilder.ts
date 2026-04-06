import fs from "node:fs/promises";
import path from "node:path";

const WORKSPACE_DIR = process.env["WORKSPACE_DIR"] ?? "/workspace";
const DEPS_DIR = process.env["DEPS_DIR"] ?? "/deps";
const SKILLS_DIR = process.env["SKILLS_DIR"] ?? "/skills";

export interface WorkspaceFile {
  path: string;
  content: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
  prompt: string;
}

async function readDirRecursive(
  dir: string,
  basePath: string = dir
): Promise<WorkspaceFile[]> {
  const files: WorkspaceFile[] = [];

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(basePath, fullPath);

    if (entry.isDirectory()) {
      const nested = await readDirRecursive(fullPath, basePath);
      files.push(...nested);
    } else if (entry.isFile()) {
      try {
        const content = await fs.readFile(fullPath, "utf-8");
        files.push({ path: relativePath, content });
      } catch {
        // Skip unreadable files
      }
    }
  }

  return files;
}

export async function readWorkspaceFiles(): Promise<WorkspaceFile[]> {
  return readDirRecursive(WORKSPACE_DIR);
}

export async function readDeps(): Promise<WorkspaceFile[]> {
  const files: WorkspaceFile[] = [];

  let entries;
  try {
    entries = await fs.readdir(DEPS_DIR, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;

    const fullPath = path.join(DEPS_DIR, entry.name);
    try {
      const content = await fs.readFile(fullPath, "utf-8");
      files.push({ path: entry.name, content });
    } catch {
      // Skip unreadable files
    }
  }

  return files;
}

export async function readSkills(
  activatedSkillIds: string[]
): Promise<string[]> {
  if (activatedSkillIds.length === 0) return [];

  const skillsJsonPath = path.join(SKILLS_DIR, "skills.json");
  let allSkills: SkillDefinition[];

  try {
    const raw = await fs.readFile(skillsJsonPath, "utf-8");
    allSkills = JSON.parse(raw) as SkillDefinition[];
  } catch {
    return [];
  }

  const activatedSet = new Set(activatedSkillIds);
  return allSkills
    .filter((skill) => activatedSet.has(skill.id))
    .map((skill) => skill.prompt);
}

export async function buildContext(
  activatedSkillIds: string[] = []
): Promise<{
  systemPrompt: string;
  filesLoaded: number;
  depsLoaded: number;
  skillsInjected: number;
}> {
  const [workspaceFiles, deps, skillPrompts] = await Promise.all([
    readWorkspaceFiles(),
    readDeps(),
    readSkills(activatedSkillIds),
  ]);

  const sections: string[] = [];

  // Page Code section
  if (workspaceFiles.length > 0) {
    const fileContents = workspaceFiles
      .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join("\n\n");
    sections.push(`## Page Code\n${fileContents}`);
  }

  // Dependencies section
  if (deps.length > 0) {
    const depContents = deps
      .map((d) => `### ${d.path}\n\`\`\`javascript\n${d.content}\n\`\`\``)
      .join("\n\n");
    sections.push(`## Dependencies\n${depContents}`);
  }

  // Active Skills section — placed prominently so AI follows these rules
  if (skillPrompts.length > 0) {
    const skillContents = skillPrompts
      .map((p, i) => `### 规则 ${i + 1}\n${p}`)
      .join("\n\n");
    sections.push(`## Active Skills — 必须遵守的编码规则\n以下是用户配置的编码规范，编写和修改代码时必须严格遵守：\n\n${skillContents}`);
  }

  const systemPrompt =
    sections.length > 0
      ? sections.join("\n\n")
      : "No workspace files, dependencies, or skills loaded.";

  return {
    systemPrompt,
    filesLoaded: workspaceFiles.length,
    depsLoaded: deps.length,
    skillsInjected: skillPrompts.length,
  };
}
