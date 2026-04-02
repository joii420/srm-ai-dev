// -------------------------------------------------
// fetch-concurrency.ts
// -------------------------------------------------
/**
 * 并发受限的 fetch 工厂
 *
 * @param limit 同时最多能进行的请求数（>0 的整数）
 * @returns 一个与原生 fetch 完全兼容的函数
 *
 * 使用方式（只需要执行一次）：
 *   import { createLimitedFetch } from './fetch-concurrency';
 *   const fetchConcurrent = createLimitedFetch(5);   // 最多 5 并发
 *   globalThis.fetch = fetchConcurrent;             // 替换全局 fetch
 *
 *   // 之后所有普通的 fetch 调用都会自动受限
 *   // fetch('https://api.example.com/...');
 */
export function createLimitedFetch(limit: number) {
  // ---------- 参数校验 ----------
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new TypeError('limit 必须是大于 0 的整数');
  }

  // ---------- 简单 Semaphore 实现 ----------
  // 等待 acquire 的 Promise 的 resolve 函数列表
  const waitingQueue: Array<() => void> = [];
  // 当前正在占用的槽位数量
  let activeCount = 0;

  /** 请求占用一个槽位 */
  function acquire(): Promise<void> {
    if (activeCount < limit) {
      activeCount++;
      return Promise.resolve();
    }

    // 没有空位，返回一个待 resolve 的 Promise
    return new Promise<void>((resolve) => waitingQueue.push(resolve));
  }

  /** 释放一个槽位，并把排队的第一个请求唤醒（如果有的话） */
  function release(): void {
    activeCount--;
    if (waitingQueue.length > 0) {
      // 取出最早进入队列的等待者并立即占用一个槽位
      activeCount++;
      const nextResolve = waitingQueue.shift()!;
      nextResolve();
    }
  }

  // ---------- 保存原始 fetch ----------
  const nativeFetch = (window.fetch as typeof fetch).bind(window);

  // ---------- 包装后的 fetch ----------
  // 与原生 fetch 完全相同的签名
  async function limitedFetch(
    input: RequestInfo,
    init?: RequestInit
  ): Promise<Response> {
    // 1?? 先 acquire 槽位（如果满了会在这里阻塞）
    await acquire();

    try {
      // 2?? 调用原始 fetch，保持所有参数、AbortSignal 等完整转发
      const response = await nativeFetch(input, init);
      return response; // 正常返回
    } catch (err) {
      // 业务层面视为错误，直接向上抛
      throw err;
    } finally {
      // 3?? 无论成功还是失败，都一定要 release，防止槽位泄漏
      release();
    }
  }

  // 为了兼容可能检查 fetch.name / fetch.length 的代码，手动设置属性
  Object.defineProperties(limitedFetch, {
    name: { value: 'fetchConcurrent' },
    length: { value: nativeFetch.length },
  });

  // ---------- 可选的状态查询（调试、监控） ----------
  // 这里把函数当成对象来挂一个属性，使用时可写成 fetchConcurrent.__status()
  (limitedFetch as any).__status = (): {
    limit: number;
    active: number;
    queued: number;
  } => ({
    limit,
    active: activeCount,
    queued: waitingQueue.length,
  });

  // ---------- 把函数本身的类型声明为原生 fetch ----------
  // 这样在其它 TS 文件里直接做 `globalThis.fetch = fetchConcurrent` 时不会报错
  return limitedFetch as typeof fetch;
}

const CONCURRENT_LIMIT = 6;
export const fetchConcurrent = createLimitedFetch(CONCURRENT_LIMIT);
