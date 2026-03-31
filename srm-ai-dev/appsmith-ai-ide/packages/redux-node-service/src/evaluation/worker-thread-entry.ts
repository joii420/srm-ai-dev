/**
 * worker_threads entry point for the evaluation engine.
 *
 * Maps Web Worker APIs (self.postMessage, self.addEventListener("message"))
 * to Node.js worker_threads APIs (parentPort.postMessage, parentPort.on("message")).
 *
 * Must be loaded as: new Worker("src/evaluation/worker-thread-entry.ts", { execArgv: [...] })
 */
import { parentPort } from "worker_threads";

// Earliest possible diagnostic — before any other code
const _diagFs = require("fs");
const _diagPath = require("path").resolve(__dirname, "../../worker-diag.log");
try { _diagFs.writeFileSync(_diagPath, `[worker] Starting at ${new Date().toISOString()}\n`); } catch {}
process.on("exit", (code: number) => {
  try { _diagFs.appendFileSync(_diagPath, `[worker] exit code=${code}\n`); } catch {}
});

if (!parentPort) {
  throw new Error("worker-thread-entry.ts must be run inside a worker_thread");
}

// Load browser global shims (window, localStorage, navigator, etc.)
// Must run before any appsmith code
require("../adapters/globals");

// --- Map Web Worker API → worker_threads API ---
// Must be set up BEFORE importing evaluation.worker which calls self.addEventListener

const _self = globalThis as any;

// Ensure self === globalThis (Web Worker convention)
_self.self = globalThis;

// postMessage: self.postMessage(data) → parentPort.postMessage(data)
const _parentPort = parentPort!;
_self.postMessage = (data: any) => _parentPort.postMessage(data);

// addEventListener("message"): collect handlers, dispatch { data: msg } wrapper
type MessageHandler = (event: { data: any }) => void;
const messageHandlers: MessageHandler[] = [];

_self.addEventListener = (type: string, handler: any, ..._args: any[]) => {
  if (type === "message") {
    messageHandlers.push(handler);
  } else if (type === "error") {
    // Map to process 'uncaughtException' in worker thread
    process.on("uncaughtException", (err: Error) => {
      handler({
        preventDefault: () => {},
        message: err.message,
        error: err,
      });
    });
  } else if (type === "unhandledrejection") {
    // Map to process 'unhandledRejection' in worker thread
    process.on("unhandledRejection", (reason: any) => {
      handler({
        preventDefault: () => {},
        reason: reason instanceof Error ? reason : new Error(String(reason)),
      });
    });
  }
};

// importScripts: Web Worker API for synchronously loading scripts
// In Node.js, use vm.runInThisContext for data URIs or require for file paths
_self.importScripts = (...urls: string[]) => {
  const vm = require("vm");
  const fs = require("fs");
  const path = require("path");
  for (const url of urls) {
    let code: string;
    if (url.startsWith("data:")) {
      // data:application/javascript;base64,xxx
      const match = url.match(/;base64,(.+)$/);
      if (match) {
        code = Buffer.from(match[1], "base64").toString("utf-8");
      } else {
        // data:application/javascript,<code>
        code = decodeURIComponent(url.split(",").slice(1).join(","));
      }
    } else if (url.startsWith("blob:")) {
      // blob: URLs are created by URL.createObjectURL in browser — not readable in Node.js
      console.warn(`[importScripts] Skipping blob URL: ${url.substring(0, 50)}...`);
      continue;
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      // Network URL — skip in Node.js
      console.warn(`[importScripts] Skipping network URL: ${url}`);
      continue;
    } else {
      // File path
      code = fs.readFileSync(path.resolve(url), "utf-8");
    }
    vm.runInThisContext(code, { filename: url });
  }
};

_self.removeEventListener = (type: string, handler: any) => {
  if (type === "message") {
    const idx = messageHandlers.indexOf(handler);
    if (idx >= 0) messageHandlers.splice(idx, 1);
  }
};

// Route incoming parentPort messages to all registered "message" handlers
_parentPort.on("message", (msg: any) => {
  const event = { data: msg };
  for (const handler of messageHandlers) {
    handler(event);
  }
});

// Catch unhandled errors in worker thread — write to file since stderr may not reach main thread
const _fs = require("fs");
const _diagFile = require("path").resolve(__dirname, "../../worker-diag.log");

process.on("uncaughtException", (err: any) => {
  const msg = `[worker] Uncaught: ${err?.message || err}\n${err?.stack?.split("\n").slice(0, 5).join("\n") || ""}\n`;
  try { _fs.appendFileSync(_diagFile, msg); } catch {}
  try { _parentPort.postMessage({ __workerDiag: msg }); } catch {}
});
process.on("unhandledRejection", (reason: any) => {
  const msg = `[worker] UnhandledRejection: ${reason?.message || reason?.code || String(reason)}\n`;
  try { _fs.appendFileSync(_diagFile, msg); } catch {}
  try { _parentPort.postMessage({ __workerDiag: msg }); } catch {}
});
process.on("exit", (code: number) => {
  const msg = `[worker] exit code=${code}\n`;
  try { _fs.appendFileSync(_diagFile, msg); } catch {}
});

// Keep worker alive: prevent event loop from draining (Node.js worker_threads
// exit when there are no ref'd handles, unlike Web Workers which persist)
const keepAlive = setInterval(() => {}, 1 << 30); // ~12 days
_parentPort.on("close", () => clearInterval(keepAlive));

// --- Now import the actual Worker code (triggers handler registration) ---
// Using require() to ensure it runs AFTER the API mappings above
// (ES import would be hoisted above this code)
require("../appsmith/workers/Evaluation/evaluation.worker");
