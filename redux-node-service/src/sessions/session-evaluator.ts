/**
 * Per-session eval worker creation.
 * Each session gets an independent worker_thread for evaluation.
 *
 * 使用 WorkerPool 预创建 worker，避免每次创建 session 时的冷启动。
 */
import { NodeEvalService } from "../adapters/worker-adapter";
import { createWorkerPool, type WorkerPool } from "../adapters/worker-pool";

/** 全局 Worker 池，服务启动时创建 */
let pool: WorkerPool | null = null;

/** 初始化 Worker 池（在服务启动时调用一次） */
export function initWorkerPool(size: number = 1) {
  if (pool) return;
  pool = createWorkerPool(size);
}

/** 获取 Worker 池实例 */
export function getWorkerPool(): WorkerPool | null {
  return pool;
}

export function createSessionEvaluator(): NodeEvalService {
  const preWarmedWorker = pool?.acquire();
  return new NodeEvalService(preWarmedWorker);
}
