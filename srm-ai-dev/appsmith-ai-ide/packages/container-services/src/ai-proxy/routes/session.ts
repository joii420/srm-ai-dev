import type { FastifyInstance } from "fastify";
import {
  getSession,
  resetSession,
  markContextRefreshed,
} from "./chat.js";
import { buildContext, readDeps } from "../services/contextBuilder.js";
import { clearSessionUsage } from "../services/skillUsageTracker.js";

const startTime = Date.now();

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/health
  app.get("/api/health", async (_request, reply) => {
    const session = getSession();
    return reply.send({
      status: "ok",
      sessionId: session.id,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    });
  });

  // GET /api/session
  app.get("/api/session", async (_request, reply) => {
    const session = getSession();
    return reply.send({
      sessionId: session.id,
      messageCount: session.messageCount,
      createdAt: session.createdAt.toISOString(),
    });
  });

  // DELETE /api/session
  app.delete("/api/session", async (_request, reply) => {
    const session = getSession();
    clearSessionUsage(session.id);
    resetSession();
    return reply.send({ success: true });
  });

  // POST /api/context/refresh
  app.post("/api/context/refresh", async (_request, reply) => {
    try {
      const result = await buildContext();
      markContextRefreshed({
        systemPrompt: result.systemPrompt,
        filesLoaded: result.filesLoaded,
        depsLoaded: result.depsLoaded,
        skillsInjected: result.skillsInjected,
      });
      return reply.send({
        success: true,
        filesLoaded: result.filesLoaded,
        depsLoaded: result.depsLoaded,
        skillsInjected: result.skillsInjected,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  // GET /api/deps
  app.get("/api/deps", async (_request, reply) => {
    try {
      const deps = await readDeps();
      return reply.send({
        deps: deps.map((d) => ({
          namespace: d.path.replace(/\.js$/, ""),
          version: "latest",
          loaded: true,
        })),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  // POST /api/deps/:name/refresh
  app.post<{ Params: { name: string } }>(
    "/api/deps/:name/refresh",
    async (request, reply) => {
      const { name } = request.params;
      try {
        // Re-read deps and find the specific one
        const deps = await readDeps();
        const dep = deps.find(
          (d) => d.path === `${name}.js` || d.path === name
        );
        if (!dep) {
          return reply.status(404).send({ error: `Dep "${name}" not found` });
        }
        return reply.send({
          success: true,
          namespace: name,
          loaded: true,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ error: message });
      }
    }
  );

  // POST /api/deps/refresh-all
  app.post("/api/deps/refresh-all", async (_request, reply) => {
    try {
      const deps = await readDeps();
      return reply.send({
        success: true,
        refreshed: deps.length,
        deps: deps.map((d) => ({
          namespace: d.path.replace(/\.js$/, ""),
          loaded: true,
        })),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });
}
