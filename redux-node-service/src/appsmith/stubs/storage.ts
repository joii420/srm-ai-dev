/**
 * Stub for utils/storage.ts (depends on localforage/IndexedDB).
 * Provides in-memory Map implementation.
 */
const memoryStore = new Map<string, any>();

const storage = {
  getItem: async (key: string): Promise<any> => memoryStore.get(key) ?? null,
  setItem: async (key: string, value: any): Promise<void> => {
    memoryStore.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    memoryStore.delete(key);
  },
  clear: async (): Promise<void> => {
    memoryStore.clear();
  },
};

export const getRecentAppEntities = async (_appId: string) => [];
export const setRecentAppEntities = async (_entities: any[], _appId: string) => {};
export const fetchRecentAppEntities = async (_recentEntitiesKey: string) => [];
export const storeRecentAppEntities = async (_entities: any[], _recentEntitiesKey: string) => {};

export default storage;
