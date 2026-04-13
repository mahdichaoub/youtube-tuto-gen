import { EventEmitter } from "events";

// ─── Event shapes ──────────────────────────────────────────────────────────────

export type PipelineStageEvent = {
  stage: string;
  status: "running" | "complete";
  progress: number;
};

export type PipelineWarningEvent = {
  type: "warning";
  message: string;
};

export type PipelineDoneEvent = {
  type: "done";
  report_id: string;
};

export type PipelineErrorEvent = {
  type: "error";
  message: string;
};

export type PipelineEvent =
  | PipelineStageEvent
  | PipelineWarningEvent
  | PipelineDoneEvent
  | PipelineErrorEvent;

// ─── Emitter registry ──────────────────────────────────────────────────────────

const emitters = new Map<string, EventEmitter>();

/**
 * Returns the EventEmitter for the given reportId.
 * Creates one if it doesn't exist yet.
 */
export function getEmitter(reportId: string): EventEmitter {
  if (!emitters.has(reportId)) {
    const ee = new EventEmitter();
    ee.setMaxListeners(20);
    emitters.set(reportId, ee);
  }
  return emitters.get(reportId)!;
}

/**
 * Removes and destroys the EventEmitter for the given reportId.
 * Call this after emitting "done" or "error" to free memory.
 */
export function removeEmitter(reportId: string): void {
  const ee = emitters.get(reportId);
  if (ee) {
    ee.removeAllListeners();
    emitters.delete(reportId);
  }
}

/**
 * Emit a pipeline event on the emitter for the given reportId.
 * No-ops silently if no emitter exists (e.g. client disconnected early).
 */
export function emitPipelineEvent(
  reportId: string,
  event: PipelineEvent
): void {
  emitters.get(reportId)?.emit("event", event);
}
