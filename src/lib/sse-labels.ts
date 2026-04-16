/**
 * Single source of truth for SSE stage → UI label mapping.
 * Raw stage values must never appear in rendered text.
 */
export const STAGE_LABELS: Record<string, string> = {
  fetching: "Reading the video",
  analyzing: "Analyzing the content",
  researching: "Researching the topic",
  teaching: "Writing your summary",
  planning: "Crafting your action plan",
  saving: "Saving your report",
  complete: "Your report is ready!",
};

export const STAGE_ORDER = [
  "fetching",
  "analyzing",
  "researching",
  "teaching",
  "planning",
  "saving",
  "complete",
] as const;

export type StageKey = (typeof STAGE_ORDER)[number];
