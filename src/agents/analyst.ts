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

export interface KeyInsight {
  claim: string;    // Bold, counter-intuitive statement
  example: string;  // Concrete example from the video
  mistake: string;  // The mistake this insight prevents
}

export interface AnalystOutput {
  video_id: string;
  hook: string;           // 1-2 sentences: why this topic matters RIGHT NOW
  core_concept: string;   // The big idea in one punchy sentence
  big_idea_prompt: string; // A provocative question the teacher should answer
  key_insights: KeyInsight[]; // Exactly 3 counter-intuitive insights
  key_highlights: string[]; // Kept for backward compat — mirrors insight claims
  mental_models: string[];
  examples_used: string[];
  warnings_and_mistakes: string[];
  key_terms: string[];
  estimated_difficulty: "beginner" | "intermediate" | "advanced";
  topic_category: string;
  usedFallback: boolean;
}

const SYSTEM_PROMPT = `You are a learning analyst extracting content from a YouTube video for a Skool-style learning experience.

Return ONLY valid JSON with these exact fields:
{
  "video_id": "string — same as input",
  "hook": "string — 1-2 punchy sentences on why this topic matters RIGHT NOW for developers/builders",
  "core_concept": "string — the big idea in one bold, memorable sentence (not a bland summary)",
  "big_idea_prompt": "string — a provocative question or statement the teacher should answer (e.g. 'Why do most developers get this completely backwards?')",
  "key_insights": [
    {
      "claim": "string — a bold, counter-intuitive statement (start with a strong verb or 'Most people...')",
      "example": "string — a concrete, specific example from the video that proves the claim",
      "mistake": "string — the common mistake this insight prevents"
    }
  ],
  "mental_models": ["string", ...],
  "examples_used": ["string", ...],
  "warnings_and_mistakes": ["string", ...],
  "key_terms": ["string", ...],
  "estimated_difficulty": "beginner" | "intermediate" | "advanced",
  "topic_category": "string — short topic label (e.g. 'React', 'System Design', 'Machine Learning')"
}

Rules:
- key_insights: EXACTLY 3 items — each must be counter-intuitive, not obvious
- hook: energetic and direct, like a Skool post opener — NO generic phrases like "In today's video..."
- core_concept: punchy and memorable, not academic
- All fields are required
- Return ONLY JSON, no markdown, no code fences`;

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
  const insights = parsed.key_insights;
  if (!Array.isArray(insights) || insights.length !== 3) {
    throw {
      code: "contract_violation",
      agent: "analyst",
      field: "key_insights",
      reason: `Expected exactly 3 items, got ${Array.isArray(insights) ? insights.length : "non-array"}`,
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

  const requiredStrings = ["video_id", "core_concept", "topic_category", "hook", "big_idea_prompt"];
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

  const keyInsights = insights as KeyInsight[];

  return {
    video_id: parsed.video_id as string,
    hook: parsed.hook as string,
    core_concept: parsed.core_concept as string,
    big_idea_prompt: parsed.big_idea_prompt as string,
    key_insights: keyInsights,
    // Backward compat: mirror insight claims as key_highlights
    key_highlights: keyInsights.map((i) => i.claim),
    mental_models: (parsed.mental_models as string[]) ?? [],
    examples_used: (parsed.examples_used as string[]) ?? [],
    warnings_and_mistakes: (parsed.warnings_and_mistakes as string[]) ?? [],
    key_terms: (parsed.key_terms as string[]) ?? [],
    estimated_difficulty: parsed.estimated_difficulty as "beginner" | "intermediate" | "advanced",
    topic_category: parsed.topic_category as string,
    usedFallback,
  };
}
