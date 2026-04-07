import fs from "node:fs/promises";
import path from "node:path";
import pino from "pino";

const logger = pino({ name: "context-builder" });

const WORKSPACE_DIR = process.env["WORKSPACE_DIR"] ?? "/workspace";
const DEPS_DIR = process.env["DEPS_DIR"] ?? "/deps";
const SKILLS_DIR = process.env["SKILLS_DIR"] ?? "/workspace/skills";

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
  if (activatedSkillIds.length === 0) {
    logger.info("[readSkills] No activatedSkillIds provided, skipping");
    return [];
  }

  const skillsJsonPath = path.join(SKILLS_DIR, "skills.json");
  logger.info({ skillsJsonPath, activatedSkillIds }, "[readSkills] Looking for skills");

  let allSkills: SkillDefinition[];

  try {
    const raw = await fs.readFile(skillsJsonPath, "utf-8");
    allSkills = JSON.parse(raw) as SkillDefinition[];
    logger.info({ count: allSkills.length, ids: allSkills.map(s => s.id) }, "[readSkills] Loaded skills from file");
  } catch (err) {
    logger.info({ error: err instanceof Error ? err.message : String(err) }, "[readSkills] Failed to read skills.json");
    return [];
  }

  const activatedSet = new Set(activatedSkillIds);
  const matched = allSkills.filter((skill) => activatedSet.has(skill.id));
  logger.info({ matched: matched.length }, "[readSkills] Matched skills");
  return matched.map((skill) => skill.prompt);
}

export async function buildContext(
  activatedSkillIds: string[] = []
): Promise<{
  systemPrompt: string;
  filesLoaded: number;
  depsLoaded: number;
  skillsInjected: number;
}> {
  const MAX_CONTEXT_CHARS = parseInt(process.env["MAX_CONTEXT_CHARS"] ?? "600000");

  const [workspaceFiles, deps, skillPrompts] = await Promise.all([
    readWorkspaceFiles(),
    readDeps(),
    readSkills(activatedSkillIds),
  ]);

  const sections: string[] = [];
  let totalChars = 0;

  // Skills first — highest priority, always included
  if (skillPrompts.length > 0) {
    const skillContents = skillPrompts
      .map((p, i) => `### 规则 ${i + 1}\n${p}`)
      .join("\n\n");
    const skillSection = `## Active Skills — 必须遵守的编码规则\n以下是用户配置的编码规范，编写和修改代码时必须严格遵守：\n\n${skillContents}`;
    sections.push(skillSection);
    totalChars += skillSection.length;
  }

  // Page Code section — truncate individual files if needed
  if (workspaceFiles.length > 0) {
    const fileEntries: string[] = [];
    for (const f of workspaceFiles) {
      const entry = `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``;
      if (totalChars + entry.length > MAX_CONTEXT_CHARS) {
        // Truncate this file's content to fit budget
        const remaining = MAX_CONTEXT_CHARS - totalChars - 200; // reserve for header/footer
        if (remaining > 500) {
          const truncated = f.content.slice(0, remaining);
          const truncEntry = `### ${f.path}\n\`\`\`\n${truncated}\n... [截断: 文件过长，已省略后续内容]\n\`\`\``;
          fileEntries.push(truncEntry);
          totalChars += truncEntry.length;
        }
        break; // Budget exhausted, skip remaining files
      }
      fileEntries.push(entry);
      totalChars += entry.length;
    }
    if (fileEntries.length > 0) {
      sections.push(`## Page Code\n${fileEntries.join("\n\n")}`);
    }
  }

  // Dependencies section — only if budget allows
  if (deps.length > 0 && totalChars < MAX_CONTEXT_CHARS) {
    const depEntries: string[] = [];
    for (const d of deps) {
      const entry = `### ${d.path}\n\`\`\`javascript\n${d.content}\n\`\`\``;
      if (totalChars + entry.length > MAX_CONTEXT_CHARS) {
        break; // Budget exhausted
      }
      depEntries.push(entry);
      totalChars += entry.length;
    }
    if (depEntries.length > 0) {
      sections.push(`## Dependencies\n${depEntries.join("\n\n")}`);
    }
  }

  logger.info(`[buildContext] totalChars=${totalChars}, files=${workspaceFiles.length}, deps=${deps.length}, skills=${skillPrompts.length}`);

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
