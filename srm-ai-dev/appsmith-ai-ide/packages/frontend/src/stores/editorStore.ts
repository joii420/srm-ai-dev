import { create } from 'zustand';

export interface EditorTab {
  id: string;
  filePath: string;
  fileName: string;
  language: string;
  /** If true, file is read-only regardless of IDE mode (e.g. dependency files) */
  readOnly?: boolean;
}

export interface CursorPosition {
  line: number;
  column: number;
}

interface EditorState {
  openTabs: EditorTab[];
  activeTabId: string | null;
  unsavedFiles: Set<string>;
  cursorPosition: CursorPosition | null;
  openFile: (tab: EditorTab) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  markUnsaved: (tabId: string) => void;
  markSaved: (tabId: string) => void;
  clearAllUnsaved: () => void;
  clearAllTabs: () => void;
  hasUnsavedFiles: () => boolean;
  setCursorPosition: (pos: CursorPosition) => void;
  renameTab: (oldPath: string, newTab: EditorTab) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  openTabs: [],
  activeTabId: null,
  unsavedFiles: new Set<string>(),
  cursorPosition: null,

  openFile: (tab) => {
    const { openTabs } = get();
    const existing = openTabs.find((t) => t.id === tab.id);
    if (!existing) {
      set({ openTabs: [...openTabs, tab], activeTabId: tab.id });
    } else {
      set({ activeTabId: tab.id });
    }
  },

  closeTab: (tabId) => {
    const { openTabs, activeTabId, unsavedFiles } = get();
    const filtered = openTabs.filter((t) => t.id !== tabId);
    const newUnsaved = new Set(unsavedFiles);
    newUnsaved.delete(tabId);

    let newActiveId = activeTabId;
    if (activeTabId === tabId) {
      const idx = openTabs.findIndex((t) => t.id === tabId);
      newActiveId = filtered.length > 0
        ? filtered[Math.min(idx, filtered.length - 1)].id
        : null;
    }

    set({ openTabs: filtered, activeTabId: newActiveId, unsavedFiles: newUnsaved });
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  markUnsaved: (tabId) => {
    const newUnsaved = new Set(get().unsavedFiles);
    newUnsaved.add(tabId);
    set({ unsavedFiles: newUnsaved });
  },

  markSaved: (tabId) => {
    const newUnsaved = new Set(get().unsavedFiles);
    newUnsaved.delete(tabId);
    set({ unsavedFiles: newUnsaved });
  },

  clearAllUnsaved: () => set({ unsavedFiles: new Set<string>() }),

  clearAllTabs: () => set({ openTabs: [], activeTabId: null, unsavedFiles: new Set<string>(), cursorPosition: null }),

  hasUnsavedFiles: () => get().unsavedFiles.size > 0,

  setCursorPosition: (pos) => set({ cursorPosition: pos }),

  renameTab: (oldPath, newTab) => {
    const { openTabs, activeTabId, unsavedFiles } = get();
    const newTabs = openTabs.map((t) => (t.id === oldPath ? newTab : t));
    const newUnsaved = new Set(unsavedFiles);
    if (newUnsaved.delete(oldPath)) {
      newUnsaved.add(newTab.id);
    }
    set({
      openTabs: newTabs,
      activeTabId: activeTabId === oldPath ? newTab.id : activeTabId,
      unsavedFiles: newUnsaved,
    });
  },
}));
