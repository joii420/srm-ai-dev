import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  addMessage: (message: ChatMessage) => void;
  addStreamChunk: (messageId: string, chunk: string) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,

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

  clearMessages: () => set({ messages: [] }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
}));
