/**
 * WorkerPool — 预创建 Worker 线程池。
 *
 * 服务启动时预创建若干 worker_thread 实例，这些 worker 会完成：
 *   1. 加载 worker-thread-entry.ts（globals shim、Web Worker API 映射）
 *   2. 加载 evaluation.worker.ts（注册 handler、触发 linkedom 预加载）
 *
 * 但不会执行 SETUP（那是 session 初始化时按需做的）。
 *
 * session 创建时调用 pool.acquire() 取一个已就绪的 Worker，
 * 跳过冷启动的模块加载时间。
 */
import { Worker } from "worker_threads";
import path from "path";

const WORKER_ENTRY = path.resolve(__dirname, "../evaluation/worker-thread-entry.ts");
const EXEC_ARGV = [
  "--require", "ts-node/register",
  "--require", "tsconfig-paths/register",
  "--unhandled-rejections=warn",
];

/** 连续 crash 后的最大自动补充次数，防止无限递归 */
const MAX_CONSECUTIVE_FAILURES = 3;

export interface WorkerPool {
  /** 从池中取一个预热好的 Worker，若池为空则现场创建 */
  acquire(): Worker;
  /** 补充池到目标大小（异步，不阻塞） */
  refill(): void;
  /** 关闭池中所有空闲 Worker */
  destroy(): Promise<void>;
  /** 当前池中空闲 Worker 数 */
  readonly idleCount: number;
}

export function createWorkerPool(size: number = 1): WorkerPool {
  const idle: Worker[] = [];
  let destroyed = false;
  let consecutiveFailures = 0;

  function spawnOne(): Worker {
    const w = new Worker(WORKER_ENTRY, {
      execArgv: EXEC_ARGV,
      stdout: true,
      stderr: true,
    });
    // Pipe stdio so logs are visible
    w.stdout?.on("data", (d: Buffer) => process.stdout.write(d));
    w.stderr?.on("data", (d: Buffer) => process.stderr.write(d));

    // If a pooled worker crashes before being acquired, discard and refill
    const onError = (err: Error) => {
      console.error("[WorkerPool] Idle worker error:", err?.message || err);
      removeFromIdle(w);
    };
    const onExit = (code: number) => {
      const wasIdle = removeFromIdle(w);
      if (wasIdle && !destroyed && code !== 0) {
        consecutiveFailures++;
        if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
          console.error(`[WorkerPool] Idle worker exited with code ${code}, refilling (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);
          refill();
        } else {
          console.error(`[WorkerPool] Too many consecutive failures (${consecutiveFailures}), stopping auto-refill`);
        }
      }
    };

    w.on("error", onError);
    w.on("exit", onExit);

    // 将清理函数挂在 worker 上，acquire() 时可以移除池的 listener
    (w as any).__poolOnError = onError;
    (w as any).__poolOnExit = onExit;

    return w;
  }

  /** 从 idle 数组中移除 worker，返回是否确实在 idle 中 */
  function removeFromIdle(w: Worker): boolean {
    const idx = idle.indexOf(w);
    if (idx >= 0) {
      idle.splice(idx, 1);
      return true;
    }
    return false;
  }

  /** 移除 worker 上的池管理 listener（acquire 后调用） */
  function detachPoolListeners(w: Worker) {
    const onError = (w as any).__poolOnError;
    const onExit = (w as any).__poolOnExit;
    if (onError) w.removeListener("error", onError);
    if (onExit) w.removeListener("exit", onExit);
    delete (w as any).__poolOnError;
    delete (w as any).__poolOnExit;
  }

  function refill() {
    if (destroyed) return;
    while (idle.length < size) {
      try {
        idle.push(spawnOne());
      } catch (err: any) {
        consecutiveFailures++;
        console.error(`[WorkerPool] Failed to spawn worker (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, err?.message || err);
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.error("[WorkerPool] Too many spawn failures, stopping auto-refill");
          break;
        }
      }
    }
  }

  function acquire(): Worker {
    if (destroyed) {
      console.warn("[WorkerPool] Pool destroyed, creating worker on demand");
      return spawnOne();
    }

    let w: Worker;
    if (idle.length > 0) {
      w = idle.shift()!;
    } else {
      console.warn("[WorkerPool] Pool empty, creating worker on demand");
      w = spawnOne();
    }

    // 移除池管理的 listener，避免与 NodeEvalService 的 listener 冲突
    detachPoolListeners(w);
    // 成功取出，重置连续失败计数
    consecutiveFailures = 0;

    // 异步补充池
    if (!destroyed) {
      setImmediate(refill);
    }
    return w;
  }

  async function destroy() {
    destroyed = true;
    const workers = idle.splice(0);
    const terminations = workers.map((w) => {
      detachPoolListeners(w);
      return w.terminate();
    });
    await Promise.allSettled(terminations);
  }

  // 初始填充
  refill();
  console.log(`[WorkerPool] Pre-created ${size} worker(s)`);

  return {
    acquire,
    refill,
    destroy,
    get idleCount() { return idle.length; },
  };
}
