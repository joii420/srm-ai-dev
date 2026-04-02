// MUST be first import — sets up browser global shims + module stubs
import './adapters/globals';

import { createServer } from './server';
import { config } from './config';

const app = createServer();
const server = app.listen(config.port, () => {
  if (!server.listening) {
    console.error(`[FATAL] Port ${config.port} is already in use. Exiting.`);
    process.exit(1);
  }
  console.log(`Redux Node Service running on http://localhost:${config.port}`);
  console.log(`  GET  /health`);
  console.log(`  POST /sessions, GET /sessions, DELETE /sessions/:id`);
  console.log(`  /sessions/:id/state, /dispatch, /eval/*, /select, /saga/*`);
  console.log(`  /sessions/:id/biz/*`);
  console.log(`  /sessions/:id/proxy/{*path}`);

  // Pre-warm heavy modules so first POST /sessions is fast
  console.time('[warmup] main');
  require('@appsmith/sagas');
  require('@appsmith/reducers');
  require('./appsmith/sagas/EvaluationsSaga');
  require('./store/saga-runner');
  require('@appsmith/configs');
  console.timeEnd('[warmup] main');

  // Pre-warm worker-side modules — warms filesystem cache + V8 code cache
  // so worker_thread startup is significantly faster
  console.time('[warmup] worker');
  require('./appsmith/workers/Evaluation/evaluation.worker');
  require('./appsmith/workers/Evaluation/handlers');
  require('./appsmith/workers/Evaluation/handlers/evalTree');
  require('./appsmith/workers/Evaluation/handlers/setupEvalEnv');
  require('./appsmith/workers/Evaluation/handlers/jsLibrary');
  require('./appsmith/workers/Evaluation/handlers/evalTrigger');
  require('./appsmith/workers/Evaluation/handlers/evalExpression');
  require('./appsmith/workers/Evaluation/fns');
  require('./appsmith/workers/common/DataTreeEvaluator');
  console.timeEnd('[warmup] worker');

  // Pre-create Worker 线程池（已完成模块加载 + linkedom 预加载，但不执行 SETUP）
  const { initWorkerPool } = require('./sessions/session-evaluator');
  initWorkerPool(1);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[FATAL] Port ${config.port} is already in use. Kill the existing process or use a different PORT.`);
  } else {
    console.error(`[FATAL] Server error:`, err.message);
  }
  process.exit(1);
});

// --- Graceful shutdown ---
async function shutdown(signal: string) {
  console.log(`\n[shutdown] Received ${signal}, cleaning up...`);
  server.close();

  const { sessionManager } = require('./sessions/session-manager');
  const sessions = sessionManager.listSessions();
  for (const s of sessions) {
    try {
      await sessionManager.destroySession(s.id);
    } catch (e) {
      console.error(`[shutdown] Error destroying session ${s.id}:`, e);
    }
  }

  // 关闭 Worker 池中空闲的 worker
  try {
    const { getWorkerPool } = require('./sessions/session-evaluator');
    const pool = getWorkerPool();
    if (pool) await pool.destroy();
  } catch {}

  console.log('[shutdown] Cleanup complete, exiting.');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Suppress verbose Axios error dumps in unhandled rejections
process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || reason?.code || String(reason);
  console.error(`[unhandledRejection] ${msg}`);
});
