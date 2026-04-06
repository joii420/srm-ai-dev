import type { FastifyInstance } from "fastify";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import pino from "pino";
import { buildContext } from "../services/contextBuilder.js";
import {
  detectUsedSkills,
  reportSkillUsage,
} from "../services/skillUsageTracker.js";
import { loadMemory } from "../services/memory/loader.js";
import { buildMemorySection } from "../services/memory/injector.js";
import { shouldUpdateMemory, updateMemory } from "../services/memory/updater.js";

const logger = pino({ name: "ai-proxy-chat" });

const WORKSPACE_DIR = process.env["WORKSPACE_DIR"] ?? "/workspace";

const ChatRequestBody = z.object({
  message: z.string().min(1),
  activatedSkillIds: z.array(z.string()).default([]),
  /** Chat history injected by backend for AI context recovery */
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).default([]),
});

interface SessionState {
  id: string;
  messageCount: number;
  createdAt: Date;
  contextRefreshed: boolean;
  /** Conversation history for multi-turn */
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  lastContext: {
    systemPrompt: string;
    filesLoaded: number;
    depsLoaded: number;
    skillsInjected: number;
  } | null;
}

let session: SessionState = createSession();

function createSession(): SessionState {
  return {
    id: crypto.randomUUID(),
    messageCount: 0,
    createdAt: new Date(),
    contextRefreshed: false,
    messages: [],
    lastContext: null,
  };
}

export function getSession(): SessionState {
  return session;
}

export function resetSession(): void {
  session = createSession();
}

export function markContextRefreshed(
  ctx: SessionState["lastContext"]
): void {
  session.contextRefreshed = true;
  session.lastContext = ctx;
}

/**
 * Build system prompt for AI Agent.
 * Includes project context, skills, and instructions for file editing.
 */
function buildAgentSystemPrompt(contextPrompt: string, memorySection: string): string {
  return `你是一个 AI 编程助手，你可以直接读取和修改项目中的代码文件。

## 工作环境
- 工作目录: ${WORKSPACE_DIR}
- jsObjects/ 目录存放 JS 代码文件（.js）
- deps/ 目录存放项目依赖库（只读参考，不要修改）

## 关键能力 —— 你可以修改文件
你可以修改项目文件。你输出特定格式的代码块后，系统会生成一个变更预览，用户确认后代码才会写入文件。
注意：你不是直接写入文件，而是提交修改建议，由用户决定是否应用。所以不要说"已写入"或"已保存"，应该说"已为您准备好修改，请确认应用"。

## 输出格式 —— 必须严格遵守
当需要创建或修改文件时，你必须使用以下格式（三个反引号后紧跟 file: 和完整文件路径）：

\`\`\`file:jsObjects/文件名.js
文件的完整内容写在这里
\`\`\`

**格式要求：**
- 反引号后必须紧跟 file: 前缀（不能用 javascript、js 或其他语言标记）
- file: 后面是相对于工作目录的完整路径
- 代码块内必须是文件的完整内容（系统会用此内容覆盖整个文件）
- 一个代码块对应一个文件

## 工作规则
1. 用户要求写代码、修改代码、创建函数等操作时，必须使用上述 \`\`\`file:路径\`\`\` 格式输出，系统会自动保存
2. 不要使用 \`\`\`javascript 或 \`\`\`js 格式，那样系统无法识别要写入哪个文件
3. 不要说"我无法修改文件"或"请手动复制" —— 你可以直接修改
4. 修改后简要说明改动内容
5. deps/ 目录下的文件只读，不要修改
6. 使用中文回复

## 示例1：修改现有文件
用户说"在 JS341.js 中添加一个获取时间戳的函数"

\`\`\`file:jsObjects/JS341.js
export default {
	myVar1: [],
	myVar2: {},
	myFun1 () {
		//	write code here
	},
	getTimestamp () {
		return Date.now();
	}
}
\`\`\`

已在 JS341.js 中添加了 getTimestamp 函数。

## 示例2：创建新文件
用户说"创建一个工具函数文件"

\`\`\`file:jsObjects/Utils.js
export default {
	formatDate (timestamp) {
		const d = new Date(timestamp);
		return d.toISOString();
	}
}
\`\`\`

已创建 Utils.js 文件。

${contextPrompt}

${memorySection}

## 重要提醒
1. 以上 Active Skills 中的规则是用户配置的编码规范，你在编写和修改代码时必须严格遵守。
2. 项目记忆上下文帮助你了解项目背景，请基于记忆中的信息理解用户需求。`;
}

/**
 * Extract file modification suggestions from AI response.
 * Primary format: ```file:path/to/file.js
 * Fallback: ```javascript or ```js blocks with a path comment on the first line
 */
function extractFileSuggestions(
  text: string
): Array<{ filePath: string; content: string }> {
  const suggestions: Array<{ filePath: string; content: string }> = [];

  // Primary: ```file:path\n...\n```
  const primaryRegex = /```file:([^\n]+)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  const matchedRanges: Array<[number, number]> = [];

  while ((match = primaryRegex.exec(text)) !== null) {
    const filePath = match[1]!.trim();
    const content = match[2] ?? "";
    suggestions.push({ filePath, content });
    matchedRanges.push([match.index, match.index + match[0].length]);
  }

  // Fallback: ```javascript\n or ```js\n blocks where first line is // path/to/file.js
  if (suggestions.length === 0) {
    const fallbackRegex = /```(?:javascript|js)\n([\s\S]*?)```/g;
    while ((match = fallbackRegex.exec(text)) !== null) {
      const blockContent = match[1] ?? "";
      // Check if first line is a path comment like: // jsObjects/MyFile.js
      const firstLine = blockContent.split("\n")[0]?.trim() ?? "";
      const pathMatch = firstLine.match(/^\/\/\s*(jsObjects\/\S+\.js)/);
      if (pathMatch) {
        const filePath = pathMatch[1]!;
        // Remove the path comment line from content
        const content = blockContent.split("\n").slice(1).join("\n");
        suggestions.push({ filePath, content });
      }
    }
  }

  if (suggestions.length > 0) {
    logger.info({ count: suggestions.length, files: suggestions.map(s => s.filePath) },
      "Extracted file suggestions from AI response");
  } else {
    // Log for debugging: check if there were any code blocks at all
    const anyCodeBlock = /```[\s\S]*?```/.test(text);
    if (anyCodeBlock) {
      logger.warn("AI response contains code blocks but none matched file: format. " +
        "AI may not be following the required output format.");
    }
  }

  return suggestions;
}

/**
 * Read current file contents for diff comparison.
 * Returns old content for each file (empty string if file doesn't exist yet).
 */
async function readOldContents(
  suggestions: Array<{ filePath: string; content: string }>,
): Promise<Map<string, string>> {
  const oldContents = new Map<string, string>();

  for (const { filePath } of suggestions) {
    try {
      const fullPath = path.resolve(WORKSPACE_DIR, filePath);
      const content = await fs.readFile(fullPath, "utf-8");
      oldContents.set(filePath, content);
    } catch {
      // File doesn't exist yet — new file
      oldContents.set(filePath, "");
    }
  }

  return oldContents;
}

/* ------------------------------------------------------------------ */
/*  Call Claude API with conversation history                          */
/* ------------------------------------------------------------------ */

async function callClaudeChat(
  systemPrompt: string,
  conversationMessages: Array<{ role: "user" | "assistant"; content: string }>,
  sendEvent: (event: string, data: unknown) => void,
): Promise<string> {
  // Dynamic import to support both @anthropic-ai/sdk and environment where it may not be installed
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropic = new Anthropic();

  const stream = anthropic.messages.stream({
    model: process.env["CLAUDE_MODEL"] ?? process.env["ANTHROPIC_MODEL"] ?? "claude-sonnet-4-20250514",
    max_tokens: parseInt(process.env["ANTHROPIC_MAX_TOKENS"] ?? "8192"),
    system: systemPrompt,
    messages: conversationMessages,
  });

  let fullResponse = "";
  // Track whether we're inside a ```file: block to suppress streaming it to chat
  let insideFileBlock = false;
  let pendingBuffer = "";
  // Marker prefix: we need to hold back text that could be the start of ```file:
  const FILE_MARKER = "```file:";

  stream.on("text", (text) => {
    fullResponse += text;
    pendingBuffer += text;

    // Process buffer line by line
    while (true) {
      const nlIdx = pendingBuffer.indexOf("\n");

      if (nlIdx < 0) {
        // No complete line yet
        if (insideFileBlock) {
          // Inside file block — hold everything, don't send
          break;
        }
        // Check if buffer could be the start of ```file: (partial match)
        // e.g. buffer is "```" or "```fi" — hold it, don't flush yet
        if (FILE_MARKER.startsWith(pendingBuffer) || pendingBuffer.endsWith("`") || pendingBuffer.endsWith("``")) {
          break; // Wait for more data
        }
        if (pendingBuffer.includes(FILE_MARKER)) {
          // Full marker found without newline — enter file block mode
          insideFileBlock = true;
          pendingBuffer = "";
          break;
        }
        // Safe to flush — not a potential file block start
        if (pendingBuffer.length > 0) {
          sendEvent("token", { content: pendingBuffer });
          pendingBuffer = "";
        }
        break;
      }

      // We have a complete line
      const line = pendingBuffer.slice(0, nlIdx + 1);
      pendingBuffer = pendingBuffer.slice(nlIdx + 1);

      if (!insideFileBlock && line.trimStart().startsWith(FILE_MARKER)) {
        insideFileBlock = true;
        continue; // Suppress this line
      }

      if (insideFileBlock) {
        // Check for closing ``` (but not another ```file:)
        const trimmed = line.trimStart();
        if (trimmed.startsWith("```") && !trimmed.startsWith(FILE_MARKER)) {
          insideFileBlock = false;
        }
        continue; // Suppress all lines inside file block
      }

      // Normal text — send to chat
      sendEvent("token", { content: line });
    }
  });

  stream.on("error", (err) => {
    logger.error({ error: err.message }, "Stream error");
  });

  try {
    await stream.finalMessage();
    // Flush any remaining non-file-block buffer
    if (pendingBuffer && !insideFileBlock) {
      sendEvent("token", { content: pendingBuffer });
      pendingBuffer = "";
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (!fullResponse) {
      throw new Error(errMsg);
    }
    // Partial response received before error — return what we have
    logger.warn({ error: errMsg }, "Stream ended with error after partial response");
  }
  return fullResponse;
}

/* ------------------------------------------------------------------ */
/*  Routes                                                             */
/* ------------------------------------------------------------------ */

export async function chatRoutes(app: FastifyInstance): Promise<void> {

  // Chat endpoint
  app.post("/api/chat", async (request, reply) => {
    const parseResult = ChatRequestBody.safeParse(request.body);
    if (!parseResult.success) {
      const message = parseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return reply.status(400).send({ error: message });
    }

    const { message, activatedSkillIds, history } = parseResult.data;

    // Build context (reads workspace code, deps, skills)
    let contextResult: Awaited<ReturnType<typeof buildContext>>;
    try {
      contextResult = await buildContext(activatedSkillIds);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error({ error: errMsg }, "Failed to build context");
      return reply.status(500).send({ error: "Failed to build context" });
    }

    session.messageCount++;

    // Load project memory
    const memory = await loadMemory();
    const memorySection = memory ? buildMemorySection(memory) : "";

    // Build system prompt with memory
    const systemPrompt = buildAgentSystemPrompt(contextResult.systemPrompt, memorySection);

    // Build conversation messages: DB history (injected by backend) + current message
    const conversationMessages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...history,
      { role: "user" as const, content: message },
    ];

    // Set up SSE headers
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    let streamEnded = false;
    const sendEvent = (event: string, data: unknown): void => {
      if (streamEnded) return;
      try {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch {
        // Stream already closed
      }
    };

    // Send system_message if context was refreshed
    if (session.contextRefreshed) {
      sendEvent("system_message", {
        message: "依赖库已更新，后续对话将使用最新接口",
        filesLoaded: contextResult.filesLoaded,
        depsLoaded: contextResult.depsLoaded,
        skillsInjected: contextResult.skillsInjected,
      });
      session.contextRefreshed = false;
    }

    try {
      // Call Claude with conversation history (from DB) + current message
      const fullResponse = await callClaudeChat(
        systemPrompt,
        conversationMessages,
        sendEvent,
      );

      // Extract file modifications — send old + new content for diff preview
      const suggestions = extractFileSuggestions(fullResponse);
      if (suggestions.length > 0) {
        const oldContents = await readOldContents(suggestions);
        for (const suggestion of suggestions) {
          sendEvent("code_suggestion", {
            type: "code_suggestion",
            filePath: suggestion.filePath,
            oldContent: oldContents.get(suggestion.filePath) ?? "",
            newContent: suggestion.content,
          });
        }
      }

      // Detect which skills were actually used
      const skillNames = new Map<string, string>();
      const usedSkills = detectUsedSkills(
        fullResponse,
        activatedSkillIds,
        skillNames
      );

      // Report usage asynchronously
      reportSkillUsage(session.id, usedSkills).catch((err) => {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.warn({ error: errMsg }, "Failed to report skill usage");
      });

      // Trigger memory update (async, non-blocking, silent)
      const fileChanges = suggestions.map((s) => s.filePath);
      if (shouldUpdateMemory({
        userMessage: message,
        assistantReply: fullResponse,
        fileChanges,
        roundCount: session.messageCount,
      })) {
        updateMemory({ userMessage: message, assistantReply: fullResponse, fileChanges }).catch((err) => {
          logger.warn({ error: err instanceof Error ? err.message : String(err) }, "Memory update failed");
        });
      }

      sendEvent("done", {
        sessionId: session.id,
        skillsUsed: usedSkills,
        fileChanges: suggestions.map((s) => s.filePath),
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error({ error: errMsg }, "Chat stream failed");
      sendEvent("error", { message: errMsg });
    } finally {
      streamEnded = true;
      reply.raw.end();
    }
  });

  // Reset session
  app.post("/api/chat/reset", async (_request, reply) => {
    resetSession();
    return reply.send({ success: true, sessionId: session.id });
  });
}
