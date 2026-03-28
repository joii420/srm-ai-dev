import { create } from 'zustand';

export interface PageInfo {
  id: string;
  name: string;
  description: string;
  status: string;
  checkedOutBy: string | null;
  updatedAt: string;
}

interface PageState {
  pages: PageInfo[];
  currentPage: PageInfo | null;
  selectedPageId: string | null;
  setPages: (pages: PageInfo[]) => void;
  setCurrentPage: (page: PageInfo | null) => void;
  setSelectedPageId: (id: string | null) => void;
}

export const usePageStore = create<PageState>((set) => ({
  pages: [],
  currentPage: null,
  selectedPageId: null,

  setPages: (pages) => set({ pages }),

  setCurrentPage: (page) => set({ currentPage: page }),

  setSelectedPageId: (id) => set({ selectedPageId: id }),
}));
