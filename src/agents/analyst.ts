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
  claim: string;
  example: string;
  mistake: string;
  deep_dive: string;       // 2–3 sentences on WHY the claim is true
  how_to_apply: string[];  // 2–4 concrete steps to apply to the user's build
}

export interface AnalystOutput {
  video_id: string;
  hook: string;
  core_concept: string;
  big_idea_prompt: string;
  analogy: string;           // NEW: one analogy that makes the core concept click
  common_mistake: string;    // NEW: the most common mistake people make with this concept
  key_insights: KeyInsight[];
  key_highlights: string[];
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
  "analogy": "string — one concrete analogy that makes the core concept immediately click (e.g. 'This is like a traffic light for your data pipeline — it stops everything when the signal is wrong')",
  "common_mistake": "string — the single most common mistake developers make with this concept and why it happens",
  "key_insights": [
    {
      "claim": "string — a bold, counter-intuitive statement (start with a strong verb or 'Most people...')",
      "example": "string — a concrete, specific example from the video that proves the claim",
      "mistake": "string — the common mistake this insight prevents",
      "deep_dive": "string — 2-3 sentences explaining WHY this claim is true at a deeper level",
      "how_to_apply": ["string — step 1", "string — step 2", "string — step 3"]
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
- each insight MUST include deep_dive (2-3 sentences) and how_to_apply (2-4 steps)
- analogy: concrete and memorable, not generic — make it specific to the domain
- common_mistake: one sentence describing the mistake, one sentence explaining why it happens
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

  // Validate new required string fields
  const newRequiredStrings = ["analogy", "common_mistake"];
  for (const field of newRequiredStrings) {
    if (typeof parsed[field] !== "string" || !(parsed[field] as string).trim()) {
      throw {
        code: "contract_violation",
        agent: "analyst",
        field,
        reason: "Missing or empty string",
      };
    }
  }

  // Validate deep_dive and how_to_apply on each insight
  const insightArray = insights as Record<string, unknown>[];
  for (let i = 0; i < insightArray.length; i++) {
    const insight = insightArray[i] as Record<string, unknown>;
    // Validate pre-existing fields
    for (const field of ["claim", "example", "mistake"] as const) {
      if (typeof insight[field] !== "string" || !(insight[field] as string).trim()) {
        throw {
          code: "contract_violation",
          agent: "analyst",
          field: `key_insights[${i}].${field}`,
          reason: "Missing or empty",
        };
      }
    }
    // Validate new enrichment fields
    if (typeof insight["deep_dive"] !== "string" || !(insight["deep_dive"] as string).trim()) {
      throw {
        code: "contract_violation",
        agent: "analyst",
        field: `key_insights[${i}].deep_dive`,
        reason: "Missing or empty",
      };
    }
    const howToApply = insight["how_to_apply"] as string[];
    if (!Array.isArray(howToApply) || howToApply.length < 2 || howToApply.length > 6) {
      throw {
        code: "contract_violation",
        agent: "analyst",
        field: `key_insights[${i}].how_to_apply`,
        reason: "Must be array with 2–6 items",
      };
    }
  }

  const keyInsights = insights as KeyInsight[];

  return {
    video_id: parsed.video_id as string,
    hook: parsed.hook as string,
    core_concept: parsed.core_concept as string,
    big_idea_prompt: parsed.big_idea_prompt as string,
    analogy: parsed.analogy as string,
    common_mistake: parsed.common_mistake as string,
    key_insights: keyInsights,
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
