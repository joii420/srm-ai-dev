import { randomUUID } from "crypto";
import type { Store } from "redux";
import type { Task } from "redux-saga";
import type { NodeEvalService } from "../adapters/worker-adapter";
import type { ActionWaiter } from "../utils/action-waiter";

export interface Session {
  id: string;
  store: Store;
  sagaTask: Task;
  evalWorker: NodeEvalService;
  actionWaiter: ActionWaiter;
  authToken: string;
  backendUrl: string;
  createdAt: Date;
}

export interface SessionSummary {
  id: string;
  authToken: string;
  backendUrl: string;
  createdAt: Date;
  stateKeys: string[];
}

export class SessionManager {
  private sessions = new Map<string, Session>();

  createSession(params: {
    store: Store;
    sagaTask: Task;
    evalWorker: NodeEvalService;
    actionWaiter: ActionWaiter;
    authToken: string;
    backendUrl: string;
  }): Session {
    const id = randomUUID();
    const session: Session = {
      id,
      ...params,
      createdAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): Session | null {
    return this.sessions.get(id) ?? null;
  }

  async destroySession(id: string): Promise<boolean> {
    const session = this.sessions.get(id);
    if (!session) return false;

    // 1. Cancel all running sagas
    try {
      session.sagaTask.cancel();
    } catch (e) {
      console.error(`[session-manager] Error cancelling saga for ${id}:`, e);
    }

    // 2. Destroy action waiter (reject all pending waitForAction promises)
    try {
      session.actionWaiter.destroy();
    } catch {}

    // 3. Terminate the worker thread
    try {
      const worker = (session.evalWorker as any)._worker;
      if (worker) {
        await worker.terminate();
      }
    } catch (e) {
      console.error(`[session-manager] Error terminating worker for ${id}:`, e);
    }

    this.sessions.delete(id);
    return true;
  }

  listSessions(): SessionSummary[] {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      authToken: s.authToken.length > 8 ? s.authToken.substring(0, 8) + "..." : s.authToken,
      backendUrl: s.backendUrl,
      createdAt: s.createdAt,
      stateKeys: Object.keys(s.store.getState()),
    }));
  }

  get size(): number {
    return this.sessions.size;
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
globalThis.sessionManager = sessionManager;
