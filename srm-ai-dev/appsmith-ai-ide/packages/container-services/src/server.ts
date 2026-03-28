import Fastify from "fastify";
import cors from "@fastify/cors";
import pino from "pino";
import { fileManagerRoutes } from "./file-manager/routes/files.js";
import { chatRoutes } from "./ai-proxy/routes/chat.js";
import { sessionRoutes } from "./ai-proxy/routes/session.js";

const logger = pino({ name: "container-services" });

const AI_PROXY_PORT = Number(process.env["AI_PROXY_PORT"] ?? 3000);
const FILE_MANAGER_PORT = Number(process.env["FILE_MANAGER_PORT"] ?? 3001);
const HOST = process.env["HOST"] ?? "0.0.0.0";

async function startAiProxy(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(chatRoutes);
  await app.register(sessionRoutes);

  await app.listen({ port: AI_PROXY_PORT, host: HOST });
  logger.info(`AI Proxy listening on ${HOST}:${AI_PROXY_PORT}`);
}

async function startFileManager(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  // Ensure UTF-8 charset on all JSON responses
  app.addHook('onSend', async (_request, reply, payload) => {
    const ct = reply.getHeader('content-type');
    if (typeof ct === 'string' && ct.startsWith('application/json') && !ct.includes('charset')) {
      reply.header('content-type', 'application/json; charset=utf-8');
    }
    return payload;
  });

  await app.register(fileManagerRoutes);

  await app.listen({ port: FILE_MANAGER_PORT, host: HOST });
  logger.info(`File Manager listening on ${HOST}:${FILE_MANAGER_PORT}`);
}

async function main(): Promise<void> {
  try {
    await Promise.all([startAiProxy(), startFileManager()]);
    logger.info("All container services started successfully");
  } catch (err) {
    logger.error(err, "Failed to start container services");
    process.exit(1);
  }
}

main();
