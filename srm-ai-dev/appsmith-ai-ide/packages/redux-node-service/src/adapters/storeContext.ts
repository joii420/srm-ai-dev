/**
 * Store context for multi-session isolation.
 *
 * Phase 2 (single store): use setDefaultStore() at startup.
 * Phase 5 (multi-session): use runWithStore() per request via AsyncLocalStorage.
 *
 * getCurrentStore() returns the correct store for the current execution context:
 *   1. AsyncLocalStorage context (per-request) takes priority
 *   2. Falls back to default store (single-store mode)
 *   3. Throws if neither is set
 */

import { AsyncLocalStorage } from 'node:async_hooks';

interface StoreContext {
  store: any;
}

let _defaultStore: any = null;
const asyncStore = new AsyncLocalStorage<StoreContext>();

/**
 * Set the global default store (Phase 2 single-store mode).
 */
export const setDefaultStore = (store: any): void => {
  _defaultStore = store;
};

/**
 * Run a function with a specific store bound to the current async context.
 * All code within `fn` (including async callbacks and saga effects)
 * will see this store via getCurrentStore().
 */
export const runWithStore = <T>(store: any, fn: () => T): T =>
  asyncStore.run({ store }, fn);

/**
 * Get the current store for this execution context.
 * Priority: AsyncLocalStorage context > default store > throw.
 */
export const getCurrentStore = (): any => {
  const ctx = asyncStore.getStore();
  if (ctx) return ctx.store;
  if (_defaultStore) return _defaultStore;
  throw new Error('No store context - must be called within runWithStore() or after setDefaultStore()');
};
