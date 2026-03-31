/**
 * NodeEvalService — Node.js replacement for GracefulWorkerService.
 *
 * Provides the same generator-based interface (*start, *shutdown, *request, *respond, *ping)
 * but uses worker_threads instead of Web Workers.
 */
import { Worker } from "worker_threads";
import { cancelled, delay, put, take } from "redux-saga/effects";
import type { Channel } from "redux-saga";
import { channel, buffers } from "redux-saga";
import { uniqueId } from "lodash";
import log from "loglevel";
import type { TMessage } from "../appsmith/utils/MessageUtil";
import { MessageType } from "../appsmith/utils/MessageUtil";
import path from "path";

export class NodeEvalService {
  private readonly _channels: Map<string, Channel<any>>;
  private _worker: Worker | null = null;
  private _isReady: boolean;
  private readonly _readyChan: Channel<any>;
  private listenerChannel: Channel<TMessage<any>>;

  constructor() {
    this.shutdown = this.shutdown.bind(this);
    this.start = this.start.bind(this);
    this._broker = this._broker.bind(this);
    this.request = this.request.bind(this);
    this.respond = this.respond.bind(this);
    this.ping = this.ping.bind(this);

    this._readyChan = channel(buffers.none());
    this._isReady = false;
    this._channels = new Map<string, Channel<any>>();
    this.listenerChannel = channel();
  }

  /**
   * Start the worker_thread and register the message broker.
   */
  *start() {
    if (this._isReady || this._worker) return;

    const entryPath = path.resolve(__dirname, "../evaluation/worker-thread-entry.ts");
    this._worker = new Worker(entryPath, {
      execArgv: [
        "--require", "ts-node/register",
        "--require", "tsconfig-paths/register",
        "--unhandled-rejections=warn",
      ],
      // Pipe worker stdout/stderr to main thread so console.error is visible
      stdout: true,
      stderr: true,
    });

    this._worker.stdout?.on("data", (data: Buffer) => process.stdout.write(data));
    this._worker.stderr?.on("data", (data: Buffer) => process.stderr.write(data));

    this._worker.on("message", this._broker);

    this._worker.on("error", (err) => {
      console.error("[NodeEvalService] Worker error:", err?.message || err);
    });

    this._worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(`[NodeEvalService] Worker exited with code ${code}`);
      }
      this._isReady = false;
      this._worker = null;
    });

    this._isReady = true;
    yield put(this._readyChan, true);
    return this.listenerChannel;
  }

  /**
   * Gracefully shutdown the worker.
   */
  *shutdown() {
    if (!this._isReady) return;
    this._isReady = false;
    // Wait for in-flight requests to drain
    while (this._channels.size > 0) {
      yield delay(10);
    }
    if (!this._worker) return;
    this._worker.removeAllListeners();
    yield this._worker.terminate();
    this._worker = null;
    this.listenerChannel.close();
  }

  /**
   * Check if the worker is ready, optionally block until it is.
   */
  *ready(block = false) {
    if (this._isReady && this._worker) return true;
    if (block) {
      yield take(this._readyChan);
      return true;
    }
    return false;
  }

  /**
   * Send a response to the worker (used by Saga to reply to worker requests).
   */
  *respond(messageId = "", data = {}): any {
    if (!messageId) return;
    yield this.ready(true);
    if (!this._worker) return;

    this._worker.postMessage({
      body: { data },
      messageId,
      messageType: MessageType.RESPONSE,
    });
  }

  /**
   * Send a one-way message to the worker.
   */
  *ping(data = {}, messageId?: string): any {
    yield this.ready(true);
    if (!this._worker) return;

    this._worker.postMessage({
      body: data,
      messageId,
      messageType: MessageType.DEFAULT,
    });
  }

  /**
   * Send a request to the worker and wait for a response.
   * Matches GracefulWorkerService.request interface.
   */
  *request(method: string, data = {}): any {
    yield this.ready(true);
    if (!this._worker) return;

    const messageId = `${method}__${uniqueId()}`;
    const ch = channel();
    this._channels.set(messageId, ch);
    const mainThreadStartTime = Date.now();
    let timeTaken: number | undefined;

    const body = {
      method,
      data,
      // No telemetry in Node.js service
      webworkerTelemetry: {},
    };

    try {
      // Sanitize: worker_threads uses structured clone which cannot handle
      // functions/Proxies. JSON round-trip strips non-serializable values.
      const message = JSON.parse(JSON.stringify({
        messageType: MessageType.REQUEST,
        body,
        messageId,
      }));
      this._worker.postMessage(message);

      // Block until the worker responds on this channel
      const response = yield take(ch);
      const { data: responseData, endTime, startTime } = response;
      timeTaken = endTime - startTime;
      return responseData;
    } finally {
      const mainThreadEndTime = Date.now();
      const timeTakenOnMainThread = mainThreadEndTime - mainThreadStartTime;

      if (yield cancelled()) {
        log.debug(`[NodeEvalService] ${method} cancelled in ${timeTakenOnMainThread}ms`);
      } else {
        log.debug(`[NodeEvalService] ${method} took ${timeTakenOnMainThread}ms`);
      }

      if (timeTaken) {
        log.debug(`[NodeEvalService] Worker ${method} took ${timeTaken}ms`);
      }

      ch.close();
      this._channels.delete(messageId);
    }
  }

  /**
   * Message broker: routes worker messages to the appropriate channel.
   */
  private _broker(msg: any) {
    if (!msg) return;
    // Diagnostic messages from worker error handlers
    if (msg.__workerDiag) {
      console.error(msg.__workerDiag);
      return;
    }
    const { body, messageId, messageType } = msg;

    if (messageType === MessageType.RESPONSE) {
      if (!messageId) return;
      const ch = this._channels.get(messageId);
      if (ch) {
        ch.put(body);
        this._channels.delete(messageId);
      }
    } else {
      // Non-response messages (DEFAULT/REQUEST from worker) go to listenerChannel
      this.listenerChannel.put(msg);
    }
  }
}
