import fs from "node:fs/promises";
import path from "node:path";
import pino from "pino";
import type { ProjectMemory } from "./types.js";

const logger = pino({ name: "memory-loader" });
const WORKSPACE_DIR = process.env["WORKSPACE_DIR"] ?? "/workspace";
const MEMORY_PATH = path.join(WORKSPACE_DIR, ".agent", "memory.json");

/**
 * Load project memory from .agent/memory.json.
 * Returns null if file doesn't exist or is corrupted.
 */
export async function loadMemory(): Promise<ProjectMemory | null> {
  try {
    const raw = await fs.readFile(MEMORY_PATH, "utf-8");
    const memory = JSON.parse(raw) as ProjectMemory;
    return memory;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOENT")) {
      logger.info("Memory file not found, will use empty context");
    } else {
      logger.warn({ error: msg }, "Failed to load memory file");
    }
    return null;
  }
}

/**
 * Save project memory to .agent/memory.json.
 */
export async function saveMemory(memory: ProjectMemory): Promise<void> {
  try {
    memory.meta.last_updated = new Date().toISOString();
    await fs.mkdir(path.dirname(MEMORY_PATH), { recursive: true });
    await fs.writeFile(MEMORY_PATH, JSON.stringify(memory, null, 2), "utf-8");
    logger.info("Memory file updated");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ error: msg }, "Failed to save memory file");
  }
}
