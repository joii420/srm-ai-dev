import express from 'express';
import { createSessionRoutes } from './routes/session.routes';
import { createActionProxyRoutes } from './routes/action-proxy.routes';
import { createBusinessRoutes } from './routes/business.routes';
import { sessionManager } from './sessions/session-manager';

export function createServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path !== '/health') {
        console.log(`[${req.method}] ${req.path} → ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: "",
      result: {
        status: 'ok',
        uptime: Math.round(process.uptime()),
        sessions: sessionManager.size,
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
        },
      },
    });
  });

  // Session routes (lifecycle + state + eval + selector + saga)
  app.use('/', createSessionRoutes());

  // Business routes (aggregated business actions)
  app.use('/', createBusinessRoutes());

  // Action proxy routes (backend API proxy)
  app.use('/', createActionProxyRoutes());

  // Global error handler — unified format
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[server-error]', err);
    res.json({ success: false, message: err.message || 'Internal Server Error', errorCode: 'INTERNAL_ERROR', result: null });
  });

  return app;
}
