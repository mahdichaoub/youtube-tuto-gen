import Anthropic from "@anthropic-ai/sdk";
import type { AnalystOutput } from "./analyst";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
1. Search the web for 2-3 high-quality articles or blog posts that explain the video's core concept clearly (prefer well-known authors, official docs, or trusted dev blogs like Josh Comeau, Kent C. Dodds, CSS-Tricks, MDN, official framework docs)
2. Search the web for 2-3 official docs or tools directly relevant to the user's project (e.g. if they mention Next.js and Stripe, find the relevant Next.js and Stripe doc pages)
3. Write an enriched explanation (2-3 paragraphs) that combines what the video taught with what you found — use analogies, be concrete, write like a smart friend explaining it

Return ONLY valid JSON (no markdown, no code fences):
{
  "concept_articles": [{ "title": string, "url": string, "summary": string, "source_type": "article" | "official_docs" }],
  "project_docs": [{ "title": string, "url": string, "summary": string, "source_type": "official_docs" | "tool" | "library" }],
  "enriched_explanation": string
}

Rules:
- Use real URLs that actually exist — do not hallucinate links
- If web search fails or returns nothing useful, use your training knowledge but only cite sources you are highly confident exist
- enriched_explanation must be at least 2 full paragraphs`;

/**
 * Researcher agent — uses Anthropic SDK directly with built-in web search tool.
 * Finds concept articles and project-relevant docs to enrich the teaching output.
 */
export async function runResearcher(
  analystOutput: AnalystOutput,
  projectContext: string,
  referenceUrl?: string | null,
  referenceUrlType?: string | null
): Promise<ResearcherOutput> {
  const referenceNote =
    referenceUrl && referenceUrlType === "extra_reading"
      ? `\nExtra reading the user provided: ${referenceUrl} — please fetch and summarize this too.`
      : referenceUrl && referenceUrlType === "project_context"
      ? `\nUser's project reference: ${referenceUrl} — read this to better understand their project.`
      : "";

  const userPrompt = `Video topic: ${analystOutput.topic_category}
Core concept: ${analystOutput.core_concept}
Difficulty: ${analystOutput.estimated_difficulty}
Key insights from the video:
${analystOutput.key_highlights.map((h, i) => `${i + 1}. ${h}`).join("\n")}

User's project context: ${projectContext}${referenceNote}

Please search for the best resources to help this person go deeper, then write an enriched explanation.`;

  try {
    // Use Anthropic's built-in web search tool
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
      messages: [{ role: "user", content: userPrompt }],
    });

    // Extract the final text block from the response
    const textBlocks = response.content.filter((b) => b.type === "text");
    const raw = textBlocks.map((b) => (b as { type: "text"; text: string }).text).join("").trim();

    return parseResearcherOutput(raw, false);
  } catch (err) {
    console.error("[researcher] web search failed, falling back to knowledge-only:", err instanceof Error ? err.message : err);

    // Fallback: run without web search tool, rely on training knowledge
    const fallbackResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT + "\n\nNote: Web search is unavailable. Use your training knowledge but only cite sources you are highly confident exist.",
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlocks = fallbackResponse.content.filter((b) => b.type === "text");
    const raw = textBlocks.map((b) => (b as { type: "text"; text: string }).text).join("").trim();

    return parseResearcherOutput(raw, true);
  }
}

function parseResearcherOutput(raw: string, usedFallback: boolean): ResearcherOutput {
  let parsed: Record<string, unknown>;
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // If JSON parse fails, return minimal valid output
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
