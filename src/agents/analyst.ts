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

const EXPERTISE_ANALYST_INSTRUCTIONS: Record<string, string> = {
  beginner: "The learner is a BEGINNER. Use plain language, avoid jargon (or define it immediately), use simple analogies, and assume no prior knowledge of this topic.",
  intermediate: "The learner has INTERMEDIATE experience. You can use standard terminology, assume basic familiarity with the domain, and introduce nuance without over-explaining basics.",
  advanced: "The learner is ADVANCED. Be precise, use correct technical terminology, surface non-obvious edge cases and trade-offs, and skip beginner-level explanations.",
};

function buildAnalystSystemPrompt(expertiseLevel: string): string {
  const expertiseInstruction = EXPERTISE_ANALYST_INSTRUCTIONS[expertiseLevel] ?? EXPERTISE_ANALYST_INSTRUCTIONS.intermediate;
  return `You are a learning analyst extracting content from a YouTube video for a Skool-style learning experience.

LEARNER LEVEL: ${expertiseInstruction}

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
- Return ONLY JSON, no markdown, no code fences

EXAMPLE OUTPUT (copy this exact structure, replace all values with content from the actual video):
{
  "video_id": "abc123",
  "hook": "React Server Components just made 80% of your useEffect calls obsolete — and most devs are still writing them anyway.",
  "core_concept": "Server Components let you run React on the server without sending any JS to the client.",
  "big_idea_prompt": "Why do most developers reach for useEffect when the server was the right answer all along?",
  "analogy": "Server Components are like a chef who preps your meal in the kitchen before it arrives — the diner never sees the cooking, just the result.",
  "common_mistake": "Developers add 'use client' to everything because it feels safer. It happens because the mental model of React as a client-side library is deeply ingrained.",
  "key_insights": [
    {
      "claim": "Most data fetching in React apps should never touch the client at all.",
      "example": "The video shows a dashboard that cut its JS bundle by 60% by moving all db queries to Server Components.",
      "mistake": "Fetching data in useEffect causes unnecessary waterfalls and exposes your data layer to the client.",
      "deep_dive": "When you fetch in a Server Component, the data never leaves the server — only the rendered HTML does. This eliminates round-trips, loading states, and bundle bloat in one move.",
      "how_to_apply": ["Audit your useEffect data fetches", "Move each one to the nearest Server Component", "Delete the loading state and error boundary that are no longer needed"]
    },
    {
      "claim": "The 'use client' directive is a boundary, not a mode — most of your app should never need it.",
      "example": "The instructor refactors a 400-line component file: only 2 interactive buttons needed 'use client'.",
      "mistake": "Adding 'use client' at the top of every file defeats the entire point of the Server Components architecture.",
      "deep_dive": "Client components are opt-in islands in a server-first architecture. The default should always be server. Only interactivity (onClick, useState, useEffect) justifies the boundary.",
      "how_to_apply": ["Remove 'use client' from non-interactive components", "Push the boundary as deep as possible toward leaf nodes", "Test that the page still works — it should"]
    },
    {
      "claim": "Streaming with Suspense lets you ship a faster perceived experience without changing your data model.",
      "example": "The video demos a page that shows a shell in 50ms while the slow query streams in 800ms later.",
      "mistake": "Waiting for all data before rendering anything makes the page feel slow even when most of it is fast.",
      "deep_dive": "Suspense boundaries let React flush the fast parts of the tree immediately and stream the slow parts as they resolve. The user sees something useful in milliseconds instead of waiting for the slowest query.",
      "how_to_apply": ["Wrap slow data components in Suspense with a skeleton fallback", "Move the slow query into its own Server Component", "Verify the fast shell renders before the data arrives"]
    }
  ],
  "mental_models": ["Server-first default", "Client as opt-in island", "Streaming as progressive enhancement"],
  "examples_used": ["Dashboard with db queries moved to server", "400-line component refactor", "Slow query streaming demo"],
  "warnings_and_mistakes": ["Over-using 'use client'", "Fetching in useEffect when server works", "Blocking render on slow queries"],
  "key_terms": ["Server Components", "use client", "Suspense", "streaming", "hydration"],
  "estimated_difficulty": "intermediate",
  "topic_category": "React"
}`;
}

/**
 * Analyst agent — single AI call via generateWithFallback.
 * Parses and validates the JSON contract before returning.
 * Throws on contract violation or model failure.
 */
export async function runAnalyst(
  fetcherOutput: FetcherOutput,
  modelConfig: ModelConfig,
  expertiseLevel: "beginner" | "intermediate" | "advanced" = "intermediate"
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
    { system: buildAnalystSystemPrompt(expertiseLevel), user: userPrompt },
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
