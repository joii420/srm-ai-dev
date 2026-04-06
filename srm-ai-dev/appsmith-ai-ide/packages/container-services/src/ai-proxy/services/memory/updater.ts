import pino from "pino";
import type { ProjectMemory } from "./types.js";
import { loadMemory, saveMemory } from "./loader.js";

const logger = pino({ name: "memory-updater" });

/**
 * Check if memory should be updated after this conversation round.
 */
export function shouldUpdateMemory(params: {
  userMessage: string;
  assistantReply: string;
  fileChanges: string[];
  roundCount: number;
}): boolean {
  const { userMessage, assistantReply, fileChanges, roundCount } = params;

  // Condition 1: File changes occurred
  if (fileChanges.length > 0) return true;

  // Condition 2: User explicitly requests memory
  const memoryKeywords = ["记住", "记录", "下次", "保存", "别忘了", "remember", "save"];
  if (memoryKeywords.some((kw) => userMessage.includes(kw))) return true;

  // Condition 3: Task status change
  const taskKeywords = ["完成了", "做好了", "开始", "新功能", "新需求", "done", "finished"];
  if (taskKeywords.some((kw) => userMessage.includes(kw) || assistantReply.includes(kw)))
    return true;

  // Condition 4: Architecture decision
  const decisionKeywords = ["决定", "方案", "架构", "改为", "采用", "选择"];
  if (decisionKeywords.some((kw) => assistantReply.includes(kw))) return true;

  // Condition 5: Every 10 rounds
  if (roundCount > 0 && roundCount % 10 === 0) return true;

  return false;
}

/**
 * Update memory by asking Claude to analyze the conversation and return updates.
 * This is a separate, silent request (not shown to the user).
 */
export async function updateMemory(params: {
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

请根据本轮对话，以 JSON 格式返回需要更新的记忆字段。
规则：
1. 只返回需要变更的字段，未变更的字段不要包含在返回中
2. current_tasks 中已完成的任务移入 completed_tasks
3. 新发现的架构信息补充到 architecture.key_modules
4. 用户表达的偏好更新到 user_preferences
5. 更新 session_stats.total_sessions 和 last_session_at
6. 如果有文件变更，更新 session_stats.total_file_changes
7. 严格只返回 JSON，不要包含任何解释文字或 markdown 标记`;

    const response = await anthropic.messages.create({
      model: process.env["CLAUDE_MODEL"] ?? "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: updatePrompt }],
    });

    // Extract text from response
    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Parse JSON updates — handle possible markdown wrapping
    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const updates = JSON.parse(jsonStr) as Partial<ProjectMemory>;

    // Merge updates into memory
    const merged = deepMerge(memory, updates);

    // Enforce limits
    if (merged.completed_tasks.length > 50) {
      merged.completed_tasks = merged.completed_tasks.slice(-50);
    }
    if (merged.decisions.length > 30) {
      merged.decisions = merged.decisions.slice(-30);
    }

    await saveMemory(merged);
    logger.info({ updatedFields: Object.keys(updates) }, "Memory updated successfully");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ error: msg }, "Failed to update memory (non-fatal)");
  }
}

/**
 * Deep merge source into target. Arrays in source replace target arrays.
 */
function deepMerge(target: ProjectMemory, source: Partial<ProjectMemory>): ProjectMemory {
  const result = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (value === null || value === undefined) continue;

    const k = key as keyof ProjectMemory;
    if (typeof value === "object" && !Array.isArray(value) && typeof result[k] === "object" && !Array.isArray(result[k])) {
      // Recursive merge for nested objects
      (result as Record<string, unknown>)[k] = { ...(result[k] as Record<string, unknown>), ...(value as Record<string, unknown>) };
    } else {
      // Direct replacement for primitives and arrays
      (result as Record<string, unknown>)[k] = value;
    }
  }

  return result;
}
