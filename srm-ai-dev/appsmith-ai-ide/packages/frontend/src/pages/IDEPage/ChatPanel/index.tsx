import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore, type ChatMessage } from '../../../stores/chatStore';
import { useSkillStore, type SkillInfo } from '../../../stores/skillStore';
import { useAuthStore } from '../../../stores/authStore';
import SkillDrawer from '../SkillDrawer';
import SkillTemplateModal from '../SkillTemplateModal';
import IntentBanner from './IntentBanner';
import { useIntentDetection } from '../../../hooks/useIntentDetection';

interface ChatPanelProps {
  pageId: string;
  enabled: boolean;
  onCodeSuggestion?: (suggestion: CodeSuggestion) => void;
}

export interface CodeSuggestion {
  filePath: string;
  content: string;
  diff?: string;
}

/**
 * Minimal markdown-to-HTML converter.
 * Handles code blocks, inline code, bold, italic, and line breaks.
 */
function markdownToHtml(md: string): string {
  if (!md) return '';
  // Extract code blocks first to protect them from HTML escaping
  const codeBlocks: string[] = [];
  let processed = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const placeholder = `\x00CB${codeBlocks.length}\x00`;
    codeBlocks.push(`<pre class="chat-code-block" data-lang="${lang}"><code>${escaped}</code></pre>`);
    return placeholder;
  });
  // Escape HTML in non-code text to prevent XSS
  processed = processed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Restore code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    processed = processed.replace(`\x00CB${i}\x00`, codeBlocks[i]);
  }
  let html = processed
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Line breaks (double newline -> paragraph, single -> br)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  html = `<p>${html}</p>`;
  return html;
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ pageId, enabled, onCodeSuggestion }) => {
  const {
    messages,
    isStreaming,
    addMessage,
    addStreamChunk,
    setStreaming,
  } = useChatStore();
  const { activatedSkillIds, skills } = useSkillStore();
  const { token } = useAuthStore();

  const [input, setInput] = useState('');
  const [skillDrawerOpen, setSkillDrawerOpen] = useState(false);
  const [templateModalSkill, setTemplateModalSkill] = useState<SkillInfo | null>(null);
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Intent detection hook
  const { matchedSkill, dismiss: dismissIntent } = useIntentDetection(input, skills);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Activated skill objects for badge display
  const activatedSkills = (skills ?? []).filter((s) => activatedSkillIds.includes(s.id));

  // Resize drag handler
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const panel = panelRef.current;
    if (!panel) return;
    const startHeight = panel.offsetHeight;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      const newHeight = Math.max(110, Math.min(window.innerHeight * 0.72, startHeight + delta));
      panel.style.height = newHeight + 'px';
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming || !enabled) return;

    setInput('');

    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    // Create placeholder for assistant response
    const assistantMsgId = generateId();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    addMessage(assistantMsg);
    setStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`/api/pages/${pageId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          activatedSkillIds,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        addStreamChunk(assistantMsgId, '[Error: failed to connect to AI service]');
        setStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          // Track SSE event type
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            continue;
          }

          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data) as {
              type?: string;
              content?: string;
              message?: string;
              file?: string;
              filePath?: string;
              diff?: string;
            };

            // Handle system_message SSE event (deps refresh notification)
            if (currentEvent === 'system_message') {
              const systemMsg: ChatMessage = {
                id: generateId(),
                role: 'system',
                content: parsed.message ?? '依赖库已更新，后续对话将使用最新接口',
                timestamp: Date.now(),
              };
              addMessage(systemMsg);
              currentEvent = '';
              continue;
            }

            if ((currentEvent === 'code_suggestion' || parsed.type === 'code_suggestion') && onCodeSuggestion) {
              onCodeSuggestion({
                filePath: parsed.file ?? parsed.filePath ?? '',
                content: parsed.content ?? '',
                diff: parsed.diff,
              });
              currentEvent = '';
            } else if (parsed.content) {
              addStreamChunk(assistantMsgId, parsed.content);
            }
          } catch {
            // Not JSON, treat as raw text chunk
            if (data) {
              addStreamChunk(assistantMsgId, data);
            }
          }

          currentEvent = '';
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        addStreamChunk(assistantMsgId, '\n\n[Error: connection lost]');
      }
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;
    }
  }, [
    input,
    isStreaming,
    enabled,
    pageId,
    token,
    activatedSkillIds,
    addMessage,
    addStreamChunk,
    setStreaming,
    onCodeSuggestion,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick invoke: inject prompt into input and send
  const handleQuickInvoke = useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

  // Template modal submit: fill generated prompt into chat input
  const handleTemplateSubmit = useCallback((prompt: string) => {
    setInput(prompt);
    setTemplateModalSkill(null);
  }, []);

  // Open template modal for a skill (from drawer or intent banner)
  const handleFillAndInvoke = useCallback((skill: SkillInfo) => {
    setTemplateModalSkill(skill);
  }, []);

  if (!enabled) {
    return (
      <div className={`chat-panel${minimized ? ' minimized' : ''}`} ref={panelRef}>
        <div className="resize-handle" onMouseDown={handleResizeMouseDown} />
        <div className="chat-hd">
          <span className="ch-title">AI 助手</span>
          <div style={{ flex: 1 }} />
          <button
            className="minimize-btn"
            onClick={() => setMinimized(!minimized)}
            title={minimized ? '展开' : '最小化'}
          >
            {minimized ? '\u25B2' : '\u25BC'}
          </button>
        </div>
        {!minimized && (
          <div className="chat-disabled-body">
            签出后可使用 AI 助手
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`chat-panel${minimized ? ' minimized' : ''}`} ref={panelRef}>
      {/* Resize handle */}
      <div className="resize-handle" onMouseDown={handleResizeMouseDown} />

      {/* Header: title + skill badges + skills btn + minimize */}
      <div className="chat-hd">
        <span className="ch-title">AI 助手</span>
        {isStreaming && <span className="ch-ai-ico" />}
        {activatedSkills.length > 0 && activatedSkills.map((skill) => (
          <span key={skill.id} className="ch-skill-badge">
            {skill.icon} {skill.name}
          </span>
        ))}
        <div style={{ flex: 1 }} />
        <button
          className="ch-skills-btn"
          onClick={() => setSkillDrawerOpen(true)}
          title="管理 Skills"
        >
          Skills{activatedSkillIds.length > 0 && ` (${activatedSkillIds.length})`}
        </button>
        <button
          className="minimize-btn"
          onClick={() => setMinimized(!minimized)}
          title={minimized ? '展开' : '最小化'}
        >
          {minimized ? '\u25B2' : '\u25BC'}
        </button>
      </div>

      {/* Messages */}
      <div className="msgs-col">
        {messages.length === 0 && (
          <div className="msgs-empty">
            在此与 AI 助手对话...
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="inp-area">
        <div className="inp-row">
          <textarea
            ref={textareaRef}
            className="inp-box"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows={2}
            disabled={isStreaming}
          />
          <button
            className="send"
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            title="发送"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Intent Banner */}
      {matchedSkill && (
        <IntentBanner
          skill={matchedSkill}
          onFillParams={() => handleFillAndInvoke(matchedSkill)}
          onDismiss={dismissIntent}
        />
      )}

      {/* Skill Drawer */}
      <SkillDrawer
        open={skillDrawerOpen}
        onClose={() => setSkillDrawerOpen(false)}
        onQuickInvoke={handleQuickInvoke}
        onFillAndInvoke={handleFillAndInvoke}
      />

      {/* Skill Template Modal */}
      <SkillTemplateModal
        skill={templateModalSkill}
        onSubmit={handleTemplateSubmit}
        onClose={() => setTemplateModalSkill(null)}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Message Bubble                                                     */
/* ------------------------------------------------------------------ */

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // System notification bubble (distinct styling)
  if (isSystem) {
    return (
      <div className="msg sys">
        <div className="bbl">
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`msg ${isUser ? 'u' : 'a'}`}>
      <div className="bbl">
        {isUser ? (
          <span className="bbl-text">{message.content}</span>
        ) : (
          <div
            className="bbl-md chat-markdown"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }}
          />
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
