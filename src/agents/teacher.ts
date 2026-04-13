import { generateWithFallback, type GenerateConfig } from "@/lib/models/call";
import type { ModelConfig } from "./analyst";
import type { FetcherOutput } from "./fetcher";
import type { AnalystOutput } from "./analyst";

const SYSTEM_PROMPT = `You are a world-class educator. Given a video transcript and analysis, write a clear teaching summary in Markdown.

Your summary MUST contain exactly these two sections in this order:
## 🧠 What This Is Really About
(A clear, jargon-free explanation of the core idea — as if explaining to a smart friend)

## 💡 The Key Things You Need to Know
(A structured breakdown of the most important concepts, using bullet points or short paragraphs)

Rules:
- Use plain Markdown only
- Both headings are REQUIRED — the output is invalid without them
- Write for clarity and understanding, not comprehensiveness
- Avoid academic or overly formal language`;

/**
 * Teacher agent — produces a Markdown summary.
 * Validates that both required headings are present.
 * Throws on contract violation or model failure.
 */
export async function runTeacher(
  fetcherOutput: FetcherOutput,
  analystOutput: AnalystOutput,
  modelConfig: ModelConfig
): Promise<{ markdown: string; usedFallback: boolean }> {
  const config: GenerateConfig = {
    timeoutMs: modelConfig.timeoutMs,
    dailyCostLimitUsd: modelConfig.dailyCostLimitUsd,
    userId: modelConfig.userId,
    reportId: modelConfig.reportId,
    agentName: "teacher",
  };

  const userPrompt = `Video: ${fetcherOutput.title}
Core Concept: ${analystOutput.core_concept}
Difficulty: ${analystOutput.estimated_difficulty}
Key Highlights:
${analystOutput.key_highlights.map((h, i) => `${i + 1}. ${h}`).join("\n")}

Transcript (excerpt):
${fetcherOutput.transcript.slice(0, 8000)}`;

  const { text, usedFallback } = await generateWithFallback(
    modelConfig.primary,
    modelConfig.fallback,
    config,
    { system: SYSTEM_PROMPT, user: userPrompt },
    2048
  );

  // Contract validation — both headings must be present
  const hasWhatItIsAbout = text.includes("## 🧠 What This Is Really About");
  const hasKeyThings = text.includes("## 💡 The Key Things You Need to Know");

  if (!hasWhatItIsAbout || !hasKeyThings) {
    throw {
      code: "contract_violation",
      agent: "teacher",
      reason: `Missing required headings. Found: whatItIsAbout=${hasWhatItIsAbout}, keyThings=${hasKeyThings}`,
    };
  }

  return { markdown: text, usedFallback };
}
