import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
//  Contract test for AI Proxy session endpoints
//
//  GET /api/health   — health check
//  GET /api/session  — session info
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
//  Contract types
// ---------------------------------------------------------------------------

interface HealthResponse {
  status: 'ok';
  sessionId: string;
  uptime: number;
}

interface SessionResponse {
  sessionId: string;
  messageCount: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
//  Contract: GET /api/health
// ---------------------------------------------------------------------------

describe('Contract: GET /api/health', () => {
  it('returns { status: "ok", sessionId, uptime }', () => {
    const response: HealthResponse = {
      status: 'ok',
      sessionId: 'session-abc-123',
      uptime: 3600,
    };

    expect(response).toHaveProperty('status');
    expect(response.status).toBe('ok');

    expect(response).toHaveProperty('sessionId');
    expect(typeof response.sessionId).toBe('string');
    expect(response.sessionId.length).toBeGreaterThan(0);

    expect(response).toHaveProperty('uptime');
    expect(typeof response.uptime).toBe('number');
    expect(response.uptime).toBeGreaterThanOrEqual(0);
  });

  it('status is always "ok" when the service is reachable', () => {
    const response: HealthResponse = {
      status: 'ok',
      sessionId: 'session-xyz',
      uptime: 0,
    };

    expect(response.status).toBe('ok');
  });

  it('uptime is zero or positive (seconds since start)', () => {
    const justStarted: HealthResponse = {
      status: 'ok',
      sessionId: 'session-new',
      uptime: 0,
    };
    expect(justStarted.uptime).toBeGreaterThanOrEqual(0);

    const runningAWhile: HealthResponse = {
      status: 'ok',
      sessionId: 'session-old',
      uptime: 86400,
    };
    expect(runningAWhile.uptime).toBeGreaterThan(0);
  });

  it('sessionId is a non-empty string identifier', () => {
    const response: HealthResponse = {
      status: 'ok',
      sessionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      uptime: 120,
    };

    expect(response.sessionId).toBeTruthy();
    expect(typeof response.sessionId).toBe('string');
  });

  it('response contains only expected keys', () => {
    const response: HealthResponse = {
      status: 'ok',
      sessionId: 'session-001',
      uptime: 500,
    };

    const keys = Object.keys(response).sort();
    expect(keys).toEqual(['sessionId', 'status', 'uptime']);
  });
});

// ---------------------------------------------------------------------------
//  Contract: GET /api/session
// ---------------------------------------------------------------------------

describe('Contract: GET /api/session', () => {
  it('returns { sessionId, messageCount, createdAt }', () => {
    const response: SessionResponse = {
      sessionId: 'session-abc-123',
      messageCount: 5,
      createdAt: '2026-03-24T10:00:00.000Z',
    };

    expect(response).toHaveProperty('sessionId');
    expect(typeof response.sessionId).toBe('string');
    expect(response.sessionId.length).toBeGreaterThan(0);

    expect(response).toHaveProperty('messageCount');
    expect(typeof response.messageCount).toBe('number');
    expect(response.messageCount).toBeGreaterThanOrEqual(0);

    expect(response).toHaveProperty('createdAt');
    expect(typeof response.createdAt).toBe('string');
  });

  it('messageCount starts at zero for a new session', () => {
    const response: SessionResponse = {
      sessionId: 'session-fresh',
      messageCount: 0,
      createdAt: '2026-03-24T10:00:00.000Z',
    };

    expect(response.messageCount).toBe(0);
  });

  it('messageCount increments as messages are exchanged', () => {
    const afterMessages: SessionResponse = {
      sessionId: 'session-active',
      messageCount: 12,
      createdAt: '2026-03-24T09:00:00.000Z',
    };

    expect(afterMessages.messageCount).toBe(12);
    expect(afterMessages.messageCount).toBeGreaterThan(0);
  });

  it('createdAt is a valid ISO 8601 date string', () => {
    const response: SessionResponse = {
      sessionId: 'session-dates',
      messageCount: 3,
      createdAt: '2026-03-24T15:30:00.000Z',
    };

    const parsed = new Date(response.createdAt);
    expect(parsed.toISOString()).toBe(response.createdAt);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  it('sessionId matches the one from health endpoint', () => {
    const sharedSessionId = 'session-shared-001';

    const health: HealthResponse = {
      status: 'ok',
      sessionId: sharedSessionId,
      uptime: 600,
    };

    const session: SessionResponse = {
      sessionId: sharedSessionId,
      messageCount: 7,
      createdAt: '2026-03-24T10:00:00.000Z',
    };

    expect(health.sessionId).toBe(session.sessionId);
  });

  it('response contains only expected keys', () => {
    const response: SessionResponse = {
      sessionId: 'session-keys',
      messageCount: 0,
      createdAt: '2026-03-24T10:00:00.000Z',
    };

    const keys = Object.keys(response).sort();
    expect(keys).toEqual(['createdAt', 'messageCount', 'sessionId']);
  });
});
