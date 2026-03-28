import type { FastifyInstance } from "fastify";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import pino from "pino";
import { buildContext } from "../services/contextBuilder.js";
import {
  detectUsedSkills,
  reportSkillUsage,
} from "../services/skillUsageTracker.js";

const logger = pino({ name: "ai-proxy-chat" });

/**
 * AI_AGENT_URL: when set, chat requests are forwarded to an external AI agent
 * instead of calling the Claude API directly.
 *
 * The external agent receives:
 *   POST { message, systemPrompt, activatedSkillIds }
 *
 * And must return SSE stream with:
 *   event: token   data: { "content": "text chunk" }
 *   event: done    data: {}
 *
 * Or return a JSON response:
 *   { "content": "full response text" }
 */
const AI_AGENT_URL = process.env["AI_AGENT_URL"] ?? "";

const ChatRequestBody = z.object({
  message: z.string().min(1),
  activatedSkillIds: z.array(z.string()).default([]),
});

interface SessionState {
  id: string;
  messageCount: number;
  createdAt: Date;
  contextRefreshed: boolean;
  lastContext: {
    systemPrompt: string;
    filesLoaded: number;
    depsLoaded: number;
    skillsInjected: number;
  } | null;
}

// Module-level session state (one session per container)
let session: SessionState = createSession();

function createSession(): SessionState {
  return {
    id: crypto.randomUUID(),
    messageCount: 0,
    createdAt: new Date(),
    contextRefreshed: false,
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

const CODE_BLOCK_REGEX =
  /```(?:diff|patch)?\n([\s\S]*?)```/g;

const FILE_DIFF_REGEX =
  /(?:^|\n)(?:---\s+a\/(.+?)\n\+\+\+\s+b\/(.+?)|\*{3}\s+(.+?))\n/g;

function extractCodeSuggestions(
  text: string
): Array<{ file: string; diff: string }> {
  const suggestions: Array<{ file: string; diff: string }> = [];
  let match: RegExpExecArray | null;

  CODE_BLOCK_REGEX.lastIndex = 0;
  while ((match = CODE_BLOCK_REGEX.exec(text)) !== null) {
    const blockContent = match[1] ?? "";

    FILE_DIFF_REGEX.lastIndex = 0;
    const fileMatch = FILE_DIFF_REGEX.exec(blockContent);
    if (fileMatch) {
      const file = fileMatch[2] ?? fileMatch[1] ?? fileMatch[3] ?? "unknown";
      suggestions.push({ file, diff: blockContent });
    }
  }

  return suggestions;
}

/* ------------------------------------------------------------------ */
/*  Call Claude API directly                                           */
/* ------------------------------------------------------------------ */

async function callClaudeAPI(
  systemPrompt: string,
  message: string,
  sendEvent: (event: string, data: unknown) => void,
): Promise<string> {
  const anthropic = new Anthropic();

  const stream = anthropic.messages.stream({
    model: process.env["ANTHROPIC_MODEL"] ?? "claude-sonnet-4-20250514",
    max_tokens: parseInt(process.env["ANTHROPIC_MAX_TOKENS"] ?? "4096"),
    system: systemPrompt,
    messages: [{ role: "user", content: message }],
  });

  let fullResponse = "";

  stream.on("text", (text) => {
    fullResponse += text;
    sendEvent("token", { content: text });
  });

  stream.on("error", (err) => {
    logger.error({ error: err.message }, "Claude stream error");
    sendEvent("error", { message: err.message });
  });

  await stream.finalMessage();
  return fullResponse;
}

/* ------------------------------------------------------------------ */
/*  Call external AI Agent                                             */
/* ------------------------------------------------------------------ */

async function callExternalAgent(
  systemPrompt: string,
  message: string,
  activatedSkillIds: string[],
  sendEvent: (event: string, data: unknown) => void,
): Promise<string> {
  logger.info({ url: AI_AGENT_URL }, "Forwarding chat to external AI agent");

  const response = await fetch(AI_AGENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      message,
      systemPrompt,
      activatedSkillIds,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`AI agent returned HTTP ${response.status}: ${errText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  // --- Handle JSON response (non-streaming) ---
  if (contentType.includes("application/json")) {
    const body = (await response.json()) as { content?: string; message?: string };
    const text = body.content ?? body.message ?? "";
    sendEvent("token", { content: text });
    return text;
  }

  // --- Handle SSE stream ---
  if (!response.body) {
    throw new Error("AI agent returned no response body");
  }

  let fullResponse = "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let currentEvent = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
        continue;
      }

      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data) as {
          content?: string;
          text?: string;
          message?: string;
          delta?: { content?: string };
        };

        // Extract text content from various possible formats
        const chunk =
          parsed.content ??
          parsed.text ??
          parsed.delta?.content ??
          parsed.message ??
          "";

        if (chunk) {
          fullResponse += chunk;

          // Only forward token events, not done/error (we handle those ourselves)
          if (!currentEvent || currentEvent === "token" || currentEvent === "message") {
            sendEvent("token", { content: chunk });
          }
        }
      } catch {
        // Non-JSON data line, treat as raw text
        if (data && data !== "[DONE]") {
          fullResponse += data;
          sendEvent("token", { content: data });
        }
      }

      currentEvent = "";
    }
  }

  return fullResponse;
}

/* ------------------------------------------------------------------ */
/*  Routes                                                             */
/* ------------------------------------------------------------------ */

export async function chatRoutes(app: FastifyInstance): Promise<void> {

  if (AI_AGENT_URL) {
    logger.info({ url: AI_AGENT_URL }, "AI Agent URL configured — chat will use external agent");
  } else {
    logger.info("No AI_AGENT_URL configured — chat will use Claude API directly");
  }

  app.post("/api/chat", async (request, reply) => {
    const parseResult = ChatRequestBody.safeParse(request.body);
    if (!parseResult.success) {
      const message = parseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return reply.status(400).send({ error: message });
    }

    const { message, activatedSkillIds } = parseResult.data;

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

    // Set up SSE headers
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const sendEvent = (event: string, data: unknown): void => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
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
      // Call AI — either external agent or Claude API
      const fullResponse = AI_AGENT_URL
        ? await callExternalAgent(
            contextResult.systemPrompt,
            message,
            activatedSkillIds,
            sendEvent,
          )
        : await callClaudeAPI(
            contextResult.systemPrompt,
            message,
            sendEvent,
          );

      // Extract code suggestions from the full response
      const suggestions = extractCodeSuggestions(fullResponse);
      for (const suggestion of suggestions) {
        sendEvent("code_suggestion", suggestion);
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

      sendEvent("done", {
        sessionId: session.id,
        skillsUsed: usedSkills,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error({ error: errMsg }, "Chat stream failed");
      sendEvent("error", { message: errMsg });
    } finally {
      reply.raw.end();
    }
  });
}
