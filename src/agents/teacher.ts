import { generateWithFallback, type GenerateConfig } from "@/lib/models/call";
import type { ModelConfig } from "./analyst";
import type { FetcherOutput } from "./fetcher";
import type { AnalystOutput } from "./analyst";
import type { ResearcherOutput } from "./researcher";

const DEPTH_INSTRUCTIONS: Record<string, string> = {
  quick: "Be concise — max 100 words per section. Bullet points preferred.",
  deep: "Be thorough — 200-300 words per section. Use prose and bullet points together.",
  expert: "Go deep — 400-500 words per section. Include mental models, edge cases, and nuances.",
};

const EXPERTISE_TEACHER_INSTRUCTIONS: Record<string, string> = {
  beginner: "The learner is a BEGINNER. Explain everything from scratch. Define all terms, use everyday analogies, avoid assumed knowledge, and be encouraging.",
  intermediate: "The learner has INTERMEDIATE experience. Use standard terminology, skip basics, but explain non-obvious concepts and trade-offs.",
  advanced: "The learner is ADVANCED. Be terse and precise. Focus on nuances, edge cases, and expert-level trade-offs. Skip all beginner-level scaffolding.",
};

function buildSystemPrompt(depth: string, expertiseLevel = "intermediate", focus?: string | null, referenceUrl?: string | null, referenceUrlType?: string | null): string {
  const depthInstruction = DEPTH_INSTRUCTIONS[depth] ?? DEPTH_INSTRUCTIONS.deep;
  const expertiseInstruction = EXPERTISE_TEACHER_INSTRUCTIONS[expertiseLevel] ?? EXPERTISE_TEACHER_INSTRUCTIONS.intermediate;
  const focusNote = focus ? `\nUser's focus: "${focus}" — weight your explanation toward this angle.` : "";
  const styleNote = referenceUrl && referenceUrlType === "style_guide"
    ? `\nStyle reference: ${referenceUrl} — match the tone and structure of this resource.`
    : "";

  return `You are a Skool-style learning coach — punchy, direct, no fluff. You make complex ideas feel obvious.

LEARNER LEVEL: ${expertiseInstruction}

Write a teaching summary with EXACTLY these three sections in this order:

## 🔥 Why This Matters To You
One punchy paragraph (3-5 sentences) tied to the user's project context. Make them feel the urgency. Start with "You're building..." or "If you're working on...". Be specific to their project — not generic.

## 💡 The Big Idea
The core concept explained as if you're talking to a smart friend who builds software. Use the enriched research explanation as your base. Include at least one analogy. Reference specific examples from the video. No jargon without a plain-English explanation.

## ⚡ 3 Insights That Change How You Build
Format each insight exactly like this (use ** for bold):
**[Bold claim]** — [concrete example from the video]. [How this applies to the user's project.]

Rules:
- BOTH section headings (🔥 and 💡 and ⚡) are REQUIRED — output is invalid without all three
- Write in second person ("you", "your") — never third person
- ${depthInstruction}${focusNote}${styleNote}
- Do NOT start with "In this video..." or "The video covers..."`;
}

/**
 * Teacher agent — produces Skool-style Markdown summary.
 * Now receives researcher enrichment and user customization options.
 * Validates that all three required headings are present.
 */
export async function runTeacher(
  fetcherOutput: FetcherOutput,
  analystOutput: AnalystOutput,
  modelConfig: ModelConfig,
  researcherOutput?: ResearcherOutput,
  depth = "deep",
  expertiseLevel: "beginner" | "intermediate" | "advanced" = "intermediate",
  focus?: string | null,
  referenceUrl?: string | null,
  referenceUrlType?: string | null
): Promise<{ markdown: string; usedFallback: boolean }> {
  const config: GenerateConfig = {
    timeoutMs: modelConfig.timeoutMs,
    dailyCostLimitUsd: modelConfig.dailyCostLimitUsd,
    userId: modelConfig.userId,
    reportId: modelConfig.reportId,
    agentName: "teacher",
  };

  const researchSection = researcherOutput?.enriched_explanation
    ? `\n## Enriched Research Context\n${researcherOutput.enriched_explanation}`
    : "";

  const userPrompt = `Video: ${fetcherOutput.title}
Difficulty: ${analystOutput.estimated_difficulty}
Topic: ${analystOutput.topic_category}

Hook (why this matters): ${analystOutput.hook}
Core Concept: ${analystOutput.core_concept}
Big Idea Prompt: ${analystOutput.big_idea_prompt}

3 Key Insights from the video:
${analystOutput.key_insights.map((insight, i) =>
    `${i + 1}. Claim: ${insight.claim}\n   Example: ${insight.example}\n   Mistake it prevents: ${insight.mistake}`
  ).join("\n\n")}${researchSection}

Transcript (excerpt):
${fetcherOutput.transcript.slice(0, 8000)}`;

  const { text, usedFallback } = await generateWithFallback(
    modelConfig.primary,
    modelConfig.fallback,
    config,
    { system: buildSystemPrompt(depth, expertiseLevel, focus, referenceUrl, referenceUrlType), user: userPrompt },
    3000
  );

  // Contract validation — all three headings must be present
  const hasWhyMatters = text.includes("## 🔥 Why This Matters To You");
  const hasBigIdea = text.includes("## 💡 The Big Idea");
  const hasInsights = text.includes("## ⚡ 3 Insights That Change How You Build");

  if (!hasWhyMatters || !hasBigIdea || !hasInsights) {
    throw {
      code: "contract_violation",
      agent: "teacher",
      reason: `Missing required headings. Found: whyMatters=${hasWhyMatters}, bigIdea=${hasBigIdea}, insights=${hasInsights}`,
    };
  }

  return { markdown: text, usedFallback };
}
