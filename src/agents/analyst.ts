import { generateWithFallback, type GenerateConfig } from "@/lib/models/call";
import type { LanguageModel } from "@/lib/models/registry";
import type { FetcherOutput } from "./fetcher";

export interface ModelConfig {
  primary: LanguageModel;
  fallback: LanguageModel | null;
  timeoutMs: number;
  dailyCostLimitUsd: number;
  userId: string;
  reportId: string;
}

export interface AnalystOutput {
  video_id: string;
  core_concept: string;
  key_highlights: string[];
  mental_models: string[];
  examples_used: string[];
  warnings_and_mistakes: string[];
  key_terms: string[];
  estimated_difficulty: "beginner" | "intermediate" | "advanced";
  topic_category: string;
  usedFallback: boolean;
}

const SYSTEM_PROMPT = `You are a learning analyst. Given a YouTube video transcript, extract a structured analysis.

Return ONLY valid JSON with these exact fields:
{
  "video_id": "string — same as input",
  "core_concept": "string — one sentence summary of the main idea",
  "key_highlights": ["string", ...],  // 5-7 items
  "mental_models": ["string", ...],   // 2-5 frameworks or thinking patterns
  "examples_used": ["string", ...],   // concrete examples from the video
  "warnings_and_mistakes": ["string", ...],  // pitfalls or common errors mentioned
  "key_terms": ["string", ...],        // important vocabulary
  "estimated_difficulty": "beginner" | "intermediate" | "advanced",
  "topic_category": "string — short topic label (e.g. 'Machine Learning', 'System Design')"
}

Rules:
- key_highlights must have 5–7 items exactly
- All fields are required
- Return ONLY JSON, no markdown, no code fences
- Do not add commentary before or after the JSON`;

/**
 * Analyst agent — single AI call via generateWithFallback.
 * Parses and validates the JSON contract before returning.
 * Throws on contract violation or model failure.
 */
export async function runAnalyst(
  fetcherOutput: FetcherOutput,
  modelConfig: ModelConfig
): Promise<AnalystOutput> {
  const config: GenerateConfig = {
    timeoutMs: modelConfig.timeoutMs,
    dailyCostLimitUsd: modelConfig.dailyCostLimitUsd,
    userId: modelConfig.userId,
    reportId: modelConfig.reportId,
    agentName: "analyst",
  };

  const truncatedTranscript = fetcherOutput.transcript.slice(0, 12000);

  const userPrompt = `Video ID: ${fetcherOutput.video_id}
Title: ${fetcherOutput.title}
Language: ${fetcherOutput.language}

Transcript:
${truncatedTranscript}`;

  const { text, usedFallback } = await generateWithFallback(
    modelConfig.primary,
    modelConfig.fallback,
    config,
    { system: SYSTEM_PROMPT, user: userPrompt },
    4096
  );

  let parsed: Record<string, unknown>;
  try {
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw {
      code: "contract_violation",
      agent: "analyst",
      reason: "JSON parse failed",
      raw: text.slice(0, 200),
    };
  }

  // Contract validation
  const highlights = parsed.key_highlights;
  if (!Array.isArray(highlights) || highlights.length < 5 || highlights.length > 7) {
    throw {
      code: "contract_violation",
      agent: "analyst",
      field: "key_highlights",
      reason: `Expected 5–7 items, got ${Array.isArray(highlights) ? highlights.length : "non-array"}`,
    };
  }

  const difficulty = parsed.estimated_difficulty;
  if (!["beginner", "intermediate", "advanced"].includes(difficulty as string)) {
    throw {
      code: "contract_violation",
      agent: "analyst",
      field: "estimated_difficulty",
      reason: `Invalid value: ${difficulty}`,
    };
  }

  const requiredStrings = ["video_id", "core_concept", "topic_category"];
  for (const field of requiredStrings) {
    if (typeof parsed[field] !== "string" || !(parsed[field] as string).trim()) {
      throw {
        code: "contract_violation",
        agent: "analyst",
        field,
        reason: "Missing or empty string",
      };
    }
  }

  return {
    video_id: parsed.video_id as string,
    core_concept: parsed.core_concept as string,
    key_highlights: parsed.key_highlights as string[],
    mental_models: (parsed.mental_models as string[]) ?? [],
    examples_used: (parsed.examples_used as string[]) ?? [],
    warnings_and_mistakes: (parsed.warnings_and_mistakes as string[]) ?? [],
    key_terms: (parsed.key_terms as string[]) ?? [],
    estimated_difficulty: parsed.estimated_difficulty as "beginner" | "intermediate" | "advanced",
    topic_category: parsed.topic_category as string,
    usedFallback,
  };
}
