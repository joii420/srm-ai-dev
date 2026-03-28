import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as fileService from "../services/fileService.js";

const FileContentBody = z.object({
  content: z.string(),
});

const BatchSaveBody = z.object({
  files: z.array(
    z.object({
      path: z.string().min(1),
      content: z.string(),
    })
  ),
});

function parseZod<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ValidationError(message);
  }
  return result.data;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export async function fileManagerRoutes(
  app: FastifyInstance
): Promise<void> {
  // GET /files — list workspace directory tree
  app.get("/files", async (_request, reply) => {
    try {
      const tree = await fileService.readDir();
      return reply.send({ tree });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  // GET /files/:path — read file content
  app.get<{ Params: { "*": string } }>("/files/*", async (request, reply) => {
    try {
      const filePath = (request.params as Record<string, string>)["*"];
      if (!filePath) {
        return reply.status(400).send({ error: "File path is required" });
      }
      const file = await fileService.readFile(filePath);
      return reply.send(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("ENOENT") || message.includes("no such file")) {
        return reply.status(404).send({ error: `File not found` });
      }
      if (message.includes("Path traversal")) {
        return reply.status(403).send({ error: message });
      }
      return reply.status(500).send({ error: message });
    }
  });

  // POST /files/:path — create file
  app.post<{ Params: { "*": string } }>(
    "/files/*",
    async (request, reply) => {
      try {
        const filePath = (request.params as Record<string, string>)["*"];
        if (!filePath) {
          return reply.status(400).send({ error: "File path is required" });
        }
        const body = parseZod(FileContentBody, request.body);

        // Check if file already exists
        try {
          await fileService.readFile(filePath);
          return reply
            .status(409)
            .send({ error: "File already exists. Use PUT to update." });
        } catch {
          // File doesn't exist — good, proceed to create
        }

        await fileService.writeFile(filePath, body.content);
        return reply.status(201).send({ path: filePath, created: true });
      } catch (err) {
        if (err instanceof ValidationError) {
          return reply.status(400).send({ error: err.message });
        }
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("Path traversal")) {
          return reply.status(403).send({ error: message });
        }
        return reply.status(500).send({ error: message });
      }
    }
  );

  // PUT /files/:path — update file
  app.put<{ Params: { "*": string } }>(
    "/files/*",
    async (request, reply) => {
      try {
        const filePath = (request.params as Record<string, string>)["*"];
        if (!filePath) {
          return reply.status(400).send({ error: "File path is required" });
        }
        const body = parseZod(FileContentBody, request.body);
        await fileService.writeFile(filePath, body.content);
        return reply.send({ path: filePath, updated: true });
      } catch (err) {
        if (err instanceof ValidationError) {
          return reply.status(400).send({ error: err.message });
        }
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("Path traversal")) {
          return reply.status(403).send({ error: message });
        }
        return reply.status(500).send({ error: message });
      }
    }
  );

  // DELETE /files/:path — delete file
  app.delete<{ Params: { "*": string } }>(
    "/files/*",
    async (request, reply) => {
      try {
        const filePath = (request.params as Record<string, string>)["*"];
        if (!filePath) {
          return reply.status(400).send({ error: "File path is required" });
        }
        await fileService.deleteFile(filePath);
        return reply.send({ path: filePath, deleted: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("ENOENT") || message.includes("no such file")) {
          return reply.status(404).send({ error: "File not found" });
        }
        if (message.includes("Path traversal")) {
          return reply.status(403).send({ error: message });
        }
        return reply.status(500).send({ error: message });
      }
    }
  );

  // POST /files/batch-save — batch write files
  app.post("/files/batch-save", async (request, reply) => {
    try {
      const body = parseZod(BatchSaveBody, request.body);
      const result = await fileService.batchSave(body.files);
      return reply.send(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        return reply.status(400).send({ error: err.message });
      }
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  // GET /diff — run git diff in workspace
  app.get("/diff", async (_request, reply) => {
    try {
      const result = await fileService.getDiff();
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  // GET /changed-files — list all changed files with content
  app.get("/changed-files", async (_request, reply) => {
    try {
      const result = await fileService.getChangedFiles();
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });
}
