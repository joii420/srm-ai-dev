import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore, loadChatHistory, saveChatMessages, clearChatHistory, type ChatMessage } from '../../../stores/chatStore';
import { useSkillStore, type SkillInfo } from '../../../stores/skillStore';
import { useAuthStore } from '../../../stores/authStore';
import { apiClient } from '../../../services/api';
import SkillDrawer from '../SkillDrawer';
import SkillTemplateModal from '../SkillTemplateModal';
import IntentBanner from './IntentBanner';
import ChatDiffCard from './ChatDiffCard';
import { useIntentDetection } from '../../../hooks/useIntentDetection';

interface ChatPanelProps {
  pageId: string;
  enabled: boolean;
  onCodeSuggestion?: (suggestion: CodeSuggestion) => void;
  /** Called when AI has auto-written a file to disk — editor should reload content */
  onFileWritten?: (filePath: string, content: string) => void;
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

const ChatPanel: React.FC<ChatPanelProps> = ({ pageId, enabled, onCodeSuggestion, onFileWritten }) => {
  const {
    messages,
    isStreaming,
    hasMore,
    loadingHistory,
    addMessage,
    addStreamChunk,
    prependMessages,
    clearMessages,
    setStreaming,
    setHasMore,
    setLoadingHistory,
  } = useChatStore();
  const { activatedSkillIds, skills } = useSkillStore();
  const { token, userInfo } = useAuthStore();

  const [input, setInput] = useState('');
  const [skillDrawerOpen, setSkillDrawerOpen] = useState(false);
  const [templateModalSkill, setTemplateModalSkill] = useState<SkillInfo | null>(null);
  const [minimized, setMinimized] = useState(false);

  // Diff suggestions keyed by message ID
  const [diffSuggestions, setDiffSuggestions] = useState<
    Record<string, Array<{ filePath: string; oldContent: string; newContent: string }>>
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgsColRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const historyLoadedRef = useRef(false);

  // Intent detection hook
  const { matchedSkill, dismiss: dismissIntent } = useIntentDetection(input, skills);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chat history on mount
  useEffect(() => {
    if (!pageId || historyLoadedRef.current) return;
    historyLoadedRef.current = true;

    const load = async () => {
      setLoadingHistory(true);
      try {

        clearMessages();
        const result = await loadChatHistory(pageId);
        if (result.messages.length > 0) {
          prependMessages(result.messages);
        }
        setHasMore(result.hasMore);
      } catch (err) {
        console.error('Failed to load chat history', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  // Scroll-up to load more history
  const handleScroll = useCallback(async () => {
    const el = msgsColRef.current;
    if (!el || !hasMore || loadingHistory || isStreaming) return;
    if (el.scrollTop > 50) return; // Only trigger near top

    const oldScrollHeight = el.scrollHeight;
    setLoadingHistory(true);
    try {
      const oldest = messages[0];
      const before = oldest?.createdAt ?? oldest?.timestamp
        ? new Date(oldest.createdAt ?? oldest.timestamp).toISOString()
        : undefined;


      const result = await loadChatHistory(pageId, before);
      if (result.messages.length > 0) {
        prependMessages(result.messages);
        // Maintain scroll position after prepend
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - oldScrollHeight;
        });
      }
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Failed to load more history', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [hasMore, loadingHistory, isStreaming, messages, pageId, prependMessages, setHasMore, setLoadingHistory]);

  // Clear history handler
  const handleClearHistory = useCallback(async () => {
    try {

      await clearChatHistory(pageId);
      clearMessages();
      setDiffSuggestions({});
    } catch (err) {
      console.error('Failed to clear history', err);
    }
  }, [pageId, clearMessages]);

  // Auto-scroll to bottom on new messages, streaming, and diff cards
  const lastMsgContent = messages.length > 0 ? messages[messages.length - 1]!.content : '';
  const diffCount = Object.values(diffSuggestions).reduce((sum, arr) => sum + arr.length, 0);
  useEffect(() => {
    // Small delay to ensure DOM has updated (especially for DiffCard rendering)
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages.length, lastMsgContent, isStreaming, diffCount]);

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

    // Add user message with user info
    const now = Date.now();
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: now,
      username: userInfo?.username,
      displayName: userInfo?.displayName,
      createdAt: new Date(now).toISOString(),
    };
    addMessage(userMsg);

    // Create placeholder for assistant response
    const assistantMsgId = generateId();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      username: 'AI',
      displayName: 'AI',
    };
    addMessage(assistantMsg);
    setStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`/api/ide/pages/${pageId}/chat`, {
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

      const processLine = (line: string) => {
        if (line.startsWith('event:')) {
          currentEvent = line.startsWith('event: ') ? line.slice(7).trim() : line.slice(6).trim();
          return;
        }

        const dataPrefix = line.startsWith('data: ') ? 6 : line.startsWith('data:') ? 5 : -1;
        if (dataPrefix < 0) return;
        const data = line.slice(dataPrefix).trim();
        if (!data || data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          const type = currentEvent || (parsed.type as string) || '';

          if (type === 'system_message') {
            addMessage({
              id: generateId(),
              role: 'system',
              content: (parsed.message ?? '依赖库已更新') as string,
              timestamp: Date.now(),
            });
          } else if (type === 'error') {
            addStreamChunk(assistantMsgId, `\n\n**错误：** ${(parsed.message ?? parsed.content ?? 'AI 服务异常') as string}`);
          } else if (type === 'code_suggestion') {
            const filePath = (parsed.filePath ?? parsed.file ?? '') as string;
            const oldContent = (parsed.oldContent ?? '') as string;
            const newContent = (parsed.newContent ?? parsed.content ?? '') as string;
            if (filePath) {
              setDiffSuggestions((prev) => ({
                ...prev,
                [assistantMsgId]: [
                  ...(prev[assistantMsgId] ?? []),
                  { filePath, oldContent, newContent },
                ],
              }));
            }
          } else if (parsed.content) {
            addStreamChunk(assistantMsgId, parsed.content as string);
          }
        } catch {
          if (data) addStreamChunk(assistantMsgId, data);
        }

        currentEvent = '';
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) processLine(line);
      }

      // Process any remaining data in buffer after stream ends
      if (buffer.trim()) {
        for (const line of buffer.split('\n')) processLine(line);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        addStreamChunk(assistantMsgId, '\n\n[Error: connection lost]');
      }
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;

      // Save messages to DB (user message + AI response)
      try {

        const finalMessages = useChatStore.getState().messages;
        const aiMsg = finalMessages.find((m) => m.id === assistantMsgId);
        if (aiMsg && aiMsg.content) {
          await saveChatMessages(pageId, [
            { role: 'user', content: text },
            { role: 'assistant', content: aiMsg.content },
          ]);
        }
      } catch (err) {
        console.warn('Failed to save chat messages', err);
      }
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
          className="ch-clear-btn"
          onClick={handleClearHistory}
          title="清空对话"
        >
          清空
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
      <div className="msgs-col" ref={msgsColRef} onScroll={handleScroll}>
        {loadingHistory && (
          <div className="msgs-loading">加载中...</div>
        )}
        {!loadingHistory && messages.length === 0 && (
          <div className="msgs-empty">
            在此与 AI 助手对话...
          </div>
        )}
        {messages.map((msg) => (
          <React.Fragment key={msg.id}>
            <MessageBubble message={msg} />
            {diffSuggestions[msg.id]?.map((s, i) => (
              <ChatDiffCard
                key={`${msg.id}-diff-${i}-${s.filePath}`}
                suggestion={s}
                onApply={async (sug) => {
                  // Write file via container File Manager (PUT for existing, POST for new)
                  const url = `/pages/${pageId}/container/files/${encodeURIComponent(sug.filePath)}`;
                  if (sug.oldContent) {
                    await apiClient.put(url, { content: sug.newContent });
                  } else {
                    await apiClient.post(url, { content: sug.newContent });
                  }
                  // Refresh editor
                  onFileWritten?.(sug.filePath, sug.newContent);
                }}
              />
            ))}
          </React.Fragment>
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

function formatMsgTime(msg: ChatMessage): string {
  const d = msg.createdAt ? new Date(msg.createdAt) : new Date(msg.timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const sender = isUser
    ? (message.username || message.displayName || '用户')
    : 'AI';
  const timeStr = formatMsgTime(message);

  if (isSystem) {
    return (
      <div className="msg sys">
        <div className="msg-meta">{timeStr}</div>
        <div className="bbl">
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`msg ${isUser ? 'u' : 'a'}`}>
      <div className="msg-meta">
        <span className="msg-sender">{sender}</span>
        <span className="msg-time">{timeStr}</span>
      </div>
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
