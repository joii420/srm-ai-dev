/**
 * Container-side dependency routes.
 *
 * These routes are also available via session.ts (T055).
 * This module re-exports dedicated route handlers for the deps endpoints
 * to provide a clean separation of concerns.
 */
import type { FastifyInstance } from "fastify";
import { buildContext, readDeps } from "../services/contextBuilder.js";
import { markContextRefreshed } from "./chat.js";

export async function depsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/deps — list deps loaded in this container
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

  // POST /api/deps/:name/refresh — refresh a single dep
  app.post<{ Params: { name: string } }>(
    "/api/deps/:name/refresh",
    async (request, reply) => {
      const { name } = request.params;
      try {
        const deps = await readDeps();
        const dep = deps.find(
          (d) => d.path === `${name}.js` || d.path === name
        );
        if (!dep) {
          return reply.status(404).send({ error: `Dep "${name}" not found` });
        }

        // Trigger context rebuild to pick up updated dep content
        const result = await buildContext();
        markContextRefreshed({
          systemPrompt: result.systemPrompt,
          filesLoaded: result.filesLoaded,
          depsLoaded: result.depsLoaded,
          skillsInjected: result.skillsInjected,
        });

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

  // POST /api/deps/refresh-all — refresh all deps
  app.post("/api/deps/refresh-all", async (_request, reply) => {
    try {
      const deps = await readDeps();

      // Trigger context rebuild
      const result = await buildContext();
      markContextRefreshed({
        systemPrompt: result.systemPrompt,
        filesLoaded: result.filesLoaded,
        depsLoaded: result.depsLoaded,
        skillsInjected: result.skillsInjected,
      });

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
