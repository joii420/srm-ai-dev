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
  console.time('[warmup]');
  require('@appsmith/sagas');
  require('@appsmith/reducers');
  require('./appsmith/sagas/EvaluationsSaga');
  require('./store/saga-runner');
  console.timeEnd('[warmup]');
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
