import { generateWithFallback, type GenerateConfig } from "@/lib/models/call";
import type { ModelConfig } from "./analyst";
import type { AnalystOutput } from "./analyst";

export interface ResearcherOutput {
  concept_articles: {
    title: string;
    url: string;
    summary: string;
    source_type: "article" | "official_docs";
  }[];
  project_docs: {
    title: string;
    url: string;
    summary: string;
    source_type: "official_docs" | "tool" | "library";
  }[];
  enriched_explanation: string;
  usedFallback: boolean;
}

const SYSTEM_PROMPT = `You are a research assistant helping learners go deeper on a topic from a YouTube video.

Your job:
1. Recommend 2-3 high-quality articles or blog posts that explain the video's core concept clearly (prefer well-known authors, official docs, or trusted dev blogs like Josh Comeau, Kent C. Dodds, CSS-Tricks, MDN, official framework docs)
2. Recommend 2-3 official docs or tools directly relevant to the user's project (e.g. if they mention Next.js and Stripe, find the relevant Next.js and Stripe doc pages)
3. Write an enriched explanation (2-3 paragraphs) that expands on what the video taught — use analogies, be concrete, write like a smart friend explaining it

Return ONLY valid JSON (no markdown, no code fences):
{
  "concept_articles": [{ "title": string, "url": string, "summary": string, "source_type": "article" | "official_docs" }],
  "project_docs": [{ "title": string, "url": string, "summary": string, "source_type": "official_docs" | "tool" | "library" }],
  "enriched_explanation": string
}

Rules:
- Only cite URLs you are highly confident exist — do not hallucinate links
- enriched_explanation must be at least 2 full paragraphs
- Return ONLY JSON`;

/**
 * Researcher agent — uses generateWithFallback like all other agents.
 * Works with any configured model provider (Moonshot, OpenAI, Anthropic, etc.)
 */
export async function runResearcher(
  analystOutput: AnalystOutput,
  projectContext: string,
  referenceUrl?: string | null,
  referenceUrlType?: string | null,
  modelConfig?: ModelConfig
): Promise<ResearcherOutput> {
  if (!modelConfig) {
    throw new Error("modelConfig required — researcher skipped");
  }

  const config: GenerateConfig = {
    timeoutMs: modelConfig.timeoutMs,
    dailyCostLimitUsd: modelConfig.dailyCostLimitUsd,
    userId: modelConfig.userId,
    reportId: modelConfig.reportId,
    agentName: "researcher",
  };

  const referenceNote =
    referenceUrl && referenceUrlType === "extra_reading"
      ? `\nExtra reading the user provided: ${referenceUrl} — summarize and include this.`
      : referenceUrl && referenceUrlType === "project_context"
      ? `\nUser's project reference: ${referenceUrl} — use this to better understand their project.`
      : "";

  const userPrompt = `Video topic: ${analystOutput.topic_category}
Core concept: ${analystOutput.core_concept}
Difficulty: ${analystOutput.estimated_difficulty}
Key insights from the video:
${analystOutput.key_highlights.map((h, i) => `${i + 1}. ${h}`).join("\n")}

User's project context: ${projectContext}${referenceNote}

Recommend the best resources to help this person go deeper, then write an enriched explanation.`;

  const { text, usedFallback } = await generateWithFallback(
    modelConfig.primary,
    modelConfig.fallback,
    config,
    { system: SYSTEM_PROMPT, user: userPrompt },
    2048
  );

  return parseResearcherOutput(text, usedFallback);
}

function parseResearcherOutput(raw: string, usedFallback: boolean): ResearcherOutput {
  let parsed: Record<string, unknown>;
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[researcher] JSON parse failed, returning empty research");
    return {
      concept_articles: [],
      project_docs: [],
      enriched_explanation: raw.slice(0, 1000) || "Research unavailable for this topic.",
      usedFallback: true,
    };
  }

  return {
    concept_articles: Array.isArray(parsed.concept_articles)
      ? (parsed.concept_articles as ResearcherOutput["concept_articles"])
      : [],
    project_docs: Array.isArray(parsed.project_docs)
      ? (parsed.project_docs as ResearcherOutput["project_docs"])
      : [],
    enriched_explanation:
      typeof parsed.enriched_explanation === "string" && parsed.enriched_explanation.trim()
        ? parsed.enriched_explanation
        : "Research completed. See resources below for deeper reading.",
    usedFallback,
  };
}
