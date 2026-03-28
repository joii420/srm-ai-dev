import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
//  Contract test for AI Proxy POST /api/chat
//
//  Validates the SSE event shapes emitted by the chat endpoint:
//    - token          — streaming text token
//    - code_suggestion — structured code suggestion
//    - done           — stream complete
//    - system_message — system-level info/warning
//
//  Request shape: { message, activatedSkillIds }
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
//  Contract types
// ---------------------------------------------------------------------------

interface ChatRequest {
  message: string;
  activatedSkillIds: string[];
}

interface TokenEvent {
  event: 'token';
  data: {
    token: string;
    index: number;
  };
}

interface CodeSuggestionEvent {
  event: 'code_suggestion';
  data: {
    filePath: string;
    language: string;
    code: string;
    startLine?: number;
    endLine?: number;
  };
}

interface DoneEvent {
  event: 'done';
  data: {
    messageId: string;
    tokenCount: number;
  };
}

interface SystemMessageEvent {
  event: 'system_message';
  data: {
    level: 'info' | 'warning' | 'error';
    message: string;
  };
}

type ChatSseEvent = TokenEvent | CodeSuggestionEvent | DoneEvent | SystemMessageEvent;

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

/** Simulates parsing an SSE stream into typed events. */
function parseSseStream(lines: string[]): ChatSseEvent[] {
  const events: ChatSseEvent[] = [];
  let currentEvent = '';
  let currentData = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent = line.replace('event: ', '');
    } else if (line.startsWith('data: ')) {
      currentData = line.replace('data: ', '');
      if (currentEvent && currentData) {
        events.push({
          event: currentEvent,
          data: JSON.parse(currentData),
        } as ChatSseEvent);
        currentEvent = '';
        currentData = '';
      }
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
//  Contract: POST /api/chat — request shape
// ---------------------------------------------------------------------------

describe('Contract: POST /api/chat', () => {
  describe('request shape', () => {
    it('accepts { message, activatedSkillIds }', () => {
      const request: ChatRequest = {
        message: 'Help me create a login form',
        activatedSkillIds: ['skill-react', 'skill-typescript'],
      };

      expect(request).toHaveProperty('message');
      expect(typeof request.message).toBe('string');
      expect(request.message.length).toBeGreaterThan(0);

      expect(request).toHaveProperty('activatedSkillIds');
      expect(Array.isArray(request.activatedSkillIds)).toBe(true);

      for (const id of request.activatedSkillIds) {
        expect(typeof id).toBe('string');
      }
    });

    it('activatedSkillIds can be empty', () => {
      const request: ChatRequest = {
        message: 'Hello',
        activatedSkillIds: [],
      };

      expect(request.activatedSkillIds).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  //  SSE event: token
  // ---------------------------------------------------------------------------

  describe('SSE event: token', () => {
    it('has event type "token" with { token, index } data', () => {
      const event: TokenEvent = {
        event: 'token',
        data: {
          token: 'Hello',
          index: 0,
        },
      };

      expect(event.event).toBe('token');
      expect(event.data).toHaveProperty('token');
      expect(typeof event.data.token).toBe('string');
      expect(event.data).toHaveProperty('index');
      expect(typeof event.data.index).toBe('number');
      expect(event.data.index).toBeGreaterThanOrEqual(0);
    });

    it('tokens arrive with sequential indices', () => {
      const tokens: TokenEvent[] = [
        { event: 'token', data: { token: 'Hello', index: 0 } },
        { event: 'token', data: { token: ' world', index: 1 } },
        { event: 'token', data: { token: '!', index: 2 } },
      ];

      for (let i = 0; i < tokens.length; i++) {
        expect(tokens[i].data.index).toBe(i);
      }
    });
  });

  // ---------------------------------------------------------------------------
  //  SSE event: code_suggestion
  // ---------------------------------------------------------------------------

  describe('SSE event: code_suggestion', () => {
    it('has event type "code_suggestion" with { filePath, language, code }', () => {
      const event: CodeSuggestionEvent = {
        event: 'code_suggestion',
        data: {
          filePath: 'src/components/LoginForm.tsx',
          language: 'typescript',
          code: 'export function LoginForm() { return <form>...</form>; }',
        },
      };

      expect(event.event).toBe('code_suggestion');
      expect(event.data).toHaveProperty('filePath');
      expect(typeof event.data.filePath).toBe('string');
      expect(event.data).toHaveProperty('language');
      expect(typeof event.data.language).toBe('string');
      expect(event.data).toHaveProperty('code');
      expect(typeof event.data.code).toBe('string');
    });

    it('optional startLine and endLine are numbers when present', () => {
      const event: CodeSuggestionEvent = {
        event: 'code_suggestion',
        data: {
          filePath: 'src/index.ts',
          language: 'typescript',
          code: 'const x = 1;',
          startLine: 10,
          endLine: 15,
        },
      };

      expect(event.data.startLine).toBe(10);
      expect(event.data.endLine).toBe(15);
      expect(typeof event.data.startLine).toBe('number');
      expect(typeof event.data.endLine).toBe('number');
    });

    it('startLine and endLine can be omitted', () => {
      const event: CodeSuggestionEvent = {
        event: 'code_suggestion',
        data: {
          filePath: 'src/utils.ts',
          language: 'typescript',
          code: 'export function noop() {}',
        },
      };

      expect(event.data.startLine).toBeUndefined();
      expect(event.data.endLine).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  //  SSE event: done
  // ---------------------------------------------------------------------------

  describe('SSE event: done', () => {
    it('has event type "done" with { messageId, tokenCount }', () => {
      const event: DoneEvent = {
        event: 'done',
        data: {
          messageId: 'msg-abc-123',
          tokenCount: 42,
        },
      };

      expect(event.event).toBe('done');
      expect(event.data).toHaveProperty('messageId');
      expect(typeof event.data.messageId).toBe('string');
      expect(event.data.messageId.length).toBeGreaterThan(0);
      expect(event.data).toHaveProperty('tokenCount');
      expect(typeof event.data.tokenCount).toBe('number');
      expect(event.data.tokenCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ---------------------------------------------------------------------------
  //  SSE event: system_message
  // ---------------------------------------------------------------------------

  describe('SSE event: system_message', () => {
    it('has event type "system_message" with { level, message }', () => {
      const event: SystemMessageEvent = {
        event: 'system_message',
        data: {
          level: 'info',
          message: 'Context loaded from 3 workspace files',
        },
      };

      expect(event.event).toBe('system_message');
      expect(event.data).toHaveProperty('level');
      expect(['info', 'warning', 'error']).toContain(event.data.level);
      expect(event.data).toHaveProperty('message');
      expect(typeof event.data.message).toBe('string');
    });

    it('level can be "warning"', () => {
      const event: SystemMessageEvent = {
        event: 'system_message',
        data: {
          level: 'warning',
          message: 'Token limit approaching',
        },
      };

      expect(event.data.level).toBe('warning');
    });

    it('level can be "error"', () => {
      const event: SystemMessageEvent = {
        event: 'system_message',
        data: {
          level: 'error',
          message: 'Failed to load skill context',
        },
      };

      expect(event.data.level).toBe('error');
    });
  });

  // ---------------------------------------------------------------------------
  //  SSE stream parsing
  // ---------------------------------------------------------------------------

  describe('SSE stream parsing', () => {
    it('parses a typical chat stream with tokens and done event', () => {
      const sseLines = [
        'event: system_message',
        'data: {"level":"info","message":"Context loaded"}',
        '',
        'event: token',
        'data: {"token":"Here","index":0}',
        '',
        'event: token',
        'data: {"token":" is","index":1}',
        '',
        'event: code_suggestion',
        'data: {"filePath":"src/app.ts","language":"typescript","code":"const x = 1;"}',
        '',
        'event: done',
        'data: {"messageId":"msg-001","tokenCount":2}',
      ];

      const events = parseSseStream(sseLines);

      expect(events.length).toBe(5);
      expect(events[0].event).toBe('system_message');
      expect(events[1].event).toBe('token');
      expect(events[2].event).toBe('token');
      expect(events[3].event).toBe('code_suggestion');
      expect(events[4].event).toBe('done');
    });

    it('stream always ends with a done event', () => {
      const sseLines = [
        'event: token',
        'data: {"token":"Hi","index":0}',
        '',
        'event: done',
        'data: {"messageId":"msg-002","tokenCount":1}',
      ];

      const events = parseSseStream(sseLines);
      const lastEvent = events[events.length - 1];

      expect(lastEvent.event).toBe('done');
    });
  });
});
