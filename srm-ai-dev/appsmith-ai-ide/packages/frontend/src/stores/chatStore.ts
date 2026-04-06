import { create } from 'zustand';
import { apiClient } from '../services/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  /** User display fields (from DB history) */
  username?: string;
  displayName?: string;
  /** ISO string from DB, e.g. "2026-04-06T14:30:05+08:00" */
  createdAt?: string;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  hasMore: boolean;
  loadingHistory: boolean;

  addMessage: (message: ChatMessage) => void;
  addStreamChunk: (messageId: string, chunk: string) => void;
  prependMessages: (msgs: ChatMessage[]) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setLoadingHistory: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  hasMore: false,
  loadingHistory: false,

  addMessage: (message) => {
    set({ messages: [...get().messages, message] });
  },

  addStreamChunk: (messageId, chunk) => {
    const { messages } = get();
    set({
      messages: messages.map((msg) =>
        msg.id === messageId ? { ...msg, content: msg.content + chunk } : msg,
      ),
    });
  },

  /** Prepend older messages to the beginning (for scroll-up loading) */
  prependMessages: (msgs) => {
    set({ messages: [...msgs, ...get().messages] });
  },

  clearMessages: () => set({ messages: [], hasMore: false }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setHasMore: (hasMore) => set({ hasMore }),
  setLoadingHistory: (loading) => set({ loadingHistory: loading }),
}));

/* ------------------------------------------------------------------ */
/*  API helpers (called from ChatPanel)                                */
/* ------------------------------------------------------------------ */

/** Load chat history from DB */
export async function loadChatHistory(
  pageId: string,
  before?: string,
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const params: Record<string, string> = {};
  if (before) params.before = before;

  const res = await apiClient.get<{
    messages: Array<{
      id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      createdAt: string;
      username: string;
      displayName: string;
    }>;
    hasMore: boolean;
  }>(`/pages/${pageId}/chat-history/history`, { params });

  const messages: ChatMessage[] = res.data.messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.createdAt).getTime(),
    username: m.username,
    displayName: m.displayName,
    createdAt: m.createdAt,
  }));

  return { messages, hasMore: res.data.hasMore };
}

/** Save a round of chat messages to DB */
export async function saveChatMessages(
  pageId: string,
  msgs: Array<{ role: string; content: string }>,
): Promise<void> {
  await apiClient.post(`/pages/${pageId}/chat-history/messages`, msgs);
}

/** Clear chat history for current user */
export async function clearChatHistory(pageId: string): Promise<void> {
  await apiClient.post(`/pages/${pageId}/chat-history/clear`);
}
