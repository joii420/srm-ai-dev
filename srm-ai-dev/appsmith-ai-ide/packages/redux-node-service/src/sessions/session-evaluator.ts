/**
 * Per-session eval worker creation.
 * Each session gets an independent worker_thread for evaluation.
 */
import { NodeEvalService } from "../adapters/worker-adapter";

export function createSessionEvaluator(): NodeEvalService {
  return new NodeEvalService();
}
