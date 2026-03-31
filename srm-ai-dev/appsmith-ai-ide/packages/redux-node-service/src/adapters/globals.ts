/**
 * Browser global variables shim for Node.js
 * MUST be imported at the very top of the entry file before any appsmith code.
 */

const memoryStorage: Record<string, string> = {};

const localStorageShim = {
  getItem: (key: string): string | null => memoryStorage[key] ?? null,
  setItem: (key: string, value: string): void => {
    memoryStorage[key] = String(value);
  },
  removeItem: (key: string): void => {
    delete memoryStorage[key];
  },
  clear: (): void => {
    Object.keys(memoryStorage).forEach((k) => delete memoryStorage[k]);
  },
  length: 0,
  key: (index: number): string | null => Object.keys(memoryStorage)[index] ?? null,
};

const g = globalThis as any;

// window
if (!g.window) {
  g.window = g;
}
g.window.location = g.window.location || {
  pathname: '/editor',
  href: '',
  search: '',
  hash: '',
  origin: '',
  host: '',
  hostname: '',
  port: '',
  protocol: 'http:',
  assign: () => {},
  replace: () => {},
  reload: () => {},
};
g.window.__show_redux_action_log = false;
if (!g.window.navigator) {
  g.window.navigator = { onLine: true, userAgent: 'node' };
}
g.window.addEventListener = g.window.addEventListener || (() => {});
g.window.removeEventListener = g.window.removeEventListener || (() => {});
g.window.open = g.window.open || (() => null);
g.window.close = g.window.close || (() => {});
g.window.requestAnimationFrame = g.window.requestAnimationFrame || ((cb: () => void) => setTimeout(cb, 0));
g.window.cancelAnimationFrame = g.window.cancelAnimationFrame || clearTimeout;
g.window.getComputedStyle = g.window.getComputedStyle || (() => ({
  getPropertyValue: () => '',
}));
g.window.matchMedia = g.window.matchMedia || (() => ({
  matches: false,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
}));

// localStorage
g.localStorage = g.localStorage || localStorageShim;

// sessionStorage (separate instance from localStorage)
const sessionMemoryStorage: Record<string, string> = {};
g.sessionStorage = g.sessionStorage || {
  getItem: (key: string): string | null => sessionMemoryStorage[key] ?? null,
  setItem: (key: string, value: string): void => { sessionMemoryStorage[key] = String(value); },
  removeItem: (key: string): void => { delete sessionMemoryStorage[key]; },
  clear: (): void => { Object.keys(sessionMemoryStorage).forEach((k) => delete sessionMemoryStorage[k]); },
  length: 0,
  key: (index: number): string | null => Object.keys(sessionMemoryStorage)[index] ?? null,
};

// navigator
if (!g.navigator) {
  g.navigator = { onLine: true, userAgent: 'node' };
}
g.navigator.onLine = true;

// document (minimal shim, linkedom overrides in Worker)
if (!g.document) {
  g.document = {
    createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {}, click: () => {} }),
    createTextNode: () => ({}),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    body: { style: {}, appendChild: () => {}, removeChild: () => {} },
    head: { appendChild: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    createEvent: () => ({ initEvent: () => {} }),
    cookie: '',
    documentElement: { style: {} },
  };
}

// self (equals globalThis in Node.js, no action needed, but ensure it exists)
g.self = g.self || g;

// performance (Node.js has native performance, ensure global access)
g.performance = g.performance || globalThis.performance;

// HTMLElement stub (some type checks use instanceof)
if (!g.HTMLElement) {
  g.HTMLElement = class HTMLElement {};
}

// Load runtime module stubs for browser-only modules
import './module-stubs';

export {};
