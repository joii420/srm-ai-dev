import pino from "pino";
import type { ProjectMemory, UserMemory } from "./types.js";
import { loadMemory, saveMemory } from "./loader.js";

const logger = pino({ name: "memory-updater" });

const BACKEND_URL = process.env["BACKEND_URL"] ?? "http://host.docker.internal:3100";

// ─── Project Memory Update ──────────────────────────────────

/**
 * Check if project memory should be updated.
 */
export function shouldUpdateProjectMemory(params: {
  userMessage: string;
  assistantReply: string;
  fileChanges: string[];
  roundCount: number;
}): boolean {
  const { userMessage, assistantReply, fileChanges, roundCount } = params;

  if (fileChanges.length > 0) return true;

  const projectKeywords = ["记住这个项目", "记录", "下次", "保存", "别忘了"];
  if (projectKeywords.some((kw) => userMessage.includes(kw))) return true;

  const taskKeywords = ["完成了", "做好了", "开始", "新功能", "新需求", "done", "finished"];
  if (taskKeywords.some((kw) => userMessage.includes(kw) || assistantReply.includes(kw)))
    return true;

  const decisionKeywords = ["决定", "方案", "架构", "改为", "采用", "选择"];
  if (decisionKeywords.some((kw) => assistantReply.includes(kw))) return true;

  if (roundCount > 0 && roundCount % 10 === 0) return true;

  return false;
}

/**
 * Update project memory (.agent/memory.json).
 */
export async function updateProjectMemory(params: {
  userMessage: string;
  assistantReply: string;
  fileChanges: string[];
}): Promise<void> {
  const memory = await loadMemory();
  if (!memory) return;

  const { userMessage, assistantReply, fileChanges } = params;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic();

    const updatePrompt = `以下是当前项目记忆文件内容：
<memory>
${JSON.stringify(memory, null, 2)}
</memory>

以下是刚刚完成的对话摘要：
<conversation>
用户：${userMessage.slice(0, 500)}
助手：${assistantReply.slice(0, 1000)}
${fileChanges.length > 0 ? `文件变更：${fileChanges.join(", ")}` : ""}
</conversation>

请根据本轮对话，以 JSON 格式返回需要更新的项目记忆字段。
规则：
1. 只返回需要变更的字段
2. current_tasks 中已完成的任务移入 completed_tasks
3. 新发现的架构信息补充到 architecture.key_modules
4. 不要把用户个人偏好放入项目记忆（那属于用户记忆）
5. 更新 session_stats
6. 严格只返回 JSON`;

    const response = await anthropic.messages.create({
      model: process.env["CLAUDE_MODEL_LIGHT"] ?? process.env["CLAUDE_MODEL"] ?? "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: updatePrompt }],
    });

    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("");

    const jsonStr = extractJson(text);
    if (!jsonStr) {
      logger.warn({ rawText: text.slice(0, 500) }, "Claude returned no valid JSON for project memory update");
      return;
    }

    const updates = JSON.parse(jsonStr) as Partial<ProjectMemory>;
    const merged = deepMerge(memory, updates);

    if (merged.completed_tasks.length > 50) {
      merged.completed_tasks = merged.completed_tasks.slice(-50);
    }
    if (merged.decisions.length > 30) {
      merged.decisions = merged.decisions.slice(-30);
    }

    await saveMemory(merged);
    logger.info({ updatedFields: Object.keys(updates) }, "Project memory updated");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ error: msg }, "Failed to update project memory");
  }
}

// ─── User Memory Update ──────────────────────────────────────

/**
 * Check if user memory should be updated.
 */
export function shouldUpdateUserMemory(params: {
  userMessage: string;
}): boolean {
  const { userMessage } = params;

  const globalPrefKeywords = [
    "以后", "每次", "我喜欢", "我习惯", "我不喜欢", "我偏好", "我倾向",
    "不要再", "请记住", "记住我", "帮我记", "默认用", "统一用", "一律用",
    "always", "never", "I prefer", "from now on",
  ];
  if (globalPrefKeywords.some((kw) => userMessage.includes(kw))) return true;

  const backgroundKeywords = [
    "我是", "我的工作", "我主要用", "我们团队", "我负责", "我擅长",
    "I am a", "I work as", "my role",
  ];
  if (backgroundKeywords.some((kw) => userMessage.includes(kw))) return true;

  const correctionKeywords = [
    "不要总结", "不要重复", "不要解释", "直接给", "别废话",
    "少说废话", "简洁点", "不用解释",
  ];
  if (correctionKeywords.some((kw) => userMessage.includes(kw))) return true;

  return false;
}

/**
 * Update user memory by asking Claude and saving to backend DB.
 */
export async function updateUserMemory(params: {
  userMessage: string;
  assistantReply: string;
  currentUserMemory: UserMemory | null;
  authToken: string;
}): Promise<void> {
  const { userMessage, assistantReply, currentUserMemory, authToken } = params;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic();

    const updatePrompt = `以下是当前用户的记忆记录：
<user_memory>
${JSON.stringify(currentUserMemory ?? {}, null, 2)}
</user_memory>

以下是刚刚发生的对话片段：
<conversation>
用户：${userMessage.slice(0, 500)}
助手：${assistantReply.slice(0, 500)}
</conversation>

请判断此次对话是否包含需要更新到用户记忆的信息。
用户记忆是指：语言偏好、代码风格、职业背景、交互习惯等跨项目通用的个人特征。

规则：
1. 如果没有需要更新的用户级别信息，返回空 JSON 对象 {}
2. 只返回需要变更的字段
3. 不要把项目特有信息（架构、任务等）放入用户记忆
4. 严格只返回 JSON，不包含任何解释文字`;

    const response = await anthropic.messages.create({
      model: process.env["CLAUDE_MODEL_LIGHT"] ?? process.env["CLAUDE_MODEL"] ?? "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: updatePrompt }],
    });

    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("");

    const jsonStr = extractJson(text);
    if (!jsonStr) {
      logger.warn({ rawText: text.slice(0, 500) }, "Claude returned no valid JSON for user memory update");
      return;
    }

    const updates = JSON.parse(jsonStr);

    // Empty updates = nothing to change
    if (!updates || Object.keys(updates).length === 0) {
      logger.info("No user memory updates needed");
      return;
    }

    // Merge with current memory
    const merged = { ...(currentUserMemory ?? {}), ...updates };
    const mergedJson = JSON.stringify(merged);

    // Save to backend DB via API
    const res = await fetch(`${BACKEND_URL}/api/ide/user-memory`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ memoryJson: mergedJson }),
    });

    if (res.ok) {
      logger.info({ updatedFields: Object.keys(updates) }, "User memory updated via backend API");
    } else {
      logger.warn({ status: res.status }, "Failed to save user memory to backend");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ error: msg }, "Failed to update user memory");
  }
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Extract the first valid JSON object/array from Claude's response text.
 * Handles: raw JSON, ```json fenced blocks, JSON mixed with explanation text.
 */
function extractJson(text: string): string | null {
  let s = text.trim();

  // Strip ```json ... ``` fencing
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  // Try direct parse first
  try {
    JSON.parse(s);
    return s;
  } catch { /* fall through */ }

  // Find the first { ... } or [ ... ] block
  const startIdx = Math.min(
    s.indexOf("{") === -1 ? Infinity : s.indexOf("{"),
    s.indexOf("[") === -1 ? Infinity : s.indexOf("["),
  );
  if (startIdx === Infinity) return null;

  const opener = s[startIdx]!;
  const closer = opener === "{" ? "}" : "]";

  // Find matching closing bracket
  let depth = 0;
  for (let i = startIdx; i < s.length; i++) {
    if (s[i] === opener) depth++;
    else if (s[i] === closer) depth--;
    if (depth === 0) {
      const candidate = s.slice(startIdx, i + 1);
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        return null;
      }
    }
  }

  return null;
}

function deepMerge(target: ProjectMemory, source: Partial<ProjectMemory>): ProjectMemory {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value === null || value === undefined) continue;
    const k = key as keyof ProjectMemory;
    if (typeof value === "object" && !Array.isArray(value) && typeof result[k] === "object" && !Array.isArray(result[k])) {
      (result as Record<string, unknown>)[k] = { ...(result[k] as Record<string, unknown>), ...(value as Record<string, unknown>) };
    } else {
      (result as Record<string, unknown>)[k] = value;
    }
  }
  return result;
}
