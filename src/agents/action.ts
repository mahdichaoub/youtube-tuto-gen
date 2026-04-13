import { generateWithFallback, type GenerateConfig } from "@/lib/models/call";
import type { ModelConfig } from "./analyst";
import type { AnalystOutput } from "./analyst";

export interface ActionOutput {
  markdown: string;
  today: [string, string, string];
  week: [string, string, string];
  challenge: string;
  resources: string[];
  metrics: [string, string, string];
}

const SYSTEM_PROMPT = `You are a senior learning coach who creates hyper-personalized action plans.

You will receive:
1. A teaching summary from a YouTube video
2. A structured content analysis
3. The user's PROJECT CONTEXT — what they are currently building

Your job: create an action plan where EVERY task is impossible to write without knowing BOTH:
- The specific content of this video
- The user's specific project

Generic tasks are CONTRACT VIOLATIONS. Every item must reference specific concepts from the video AND the user's project.

Return ONLY valid JSON with this exact structure:
{
  "markdown": "string — full action plan in Markdown format",
  "today": ["task1", "task2", "task3"],
  "week": ["task1", "task2", "task3"],
  "challenge": "string — one 30-day challenge",
  "resources": ["resource1", "resource2", ...],
  "metrics": ["metric1", "metric2", "metric3"]
}

Rules:
- today: exactly 3 strings — high-impact tasks doable in 1–2 hours
- week: exactly 3 strings — deeper tasks for the next 7 days
- challenge: 1 string — a meaningful 30-day challenge
- resources: 2–5 strings — specific books, tools, or courses (not vague "read docs")
- metrics: exactly 3 strings — measurable signals of progress
- Return ONLY JSON, no markdown code fences, no commentary`;

/**
 * Action agent — creates a project-specific action plan.
 * project_context is passed ONLY to this agent.
 * Validates exact array lengths before returning.
 * Throws on contract violation or model failure.
 */
export async function runAction(
  teacherMd: string,
  analystOutput: AnalystOutput,
  projectContext: string,
  modelConfig: ModelConfig
): Promise<{ data: ActionOutput; usedFallback: boolean }> {
  const config: GenerateConfig = {
    timeoutMs: modelConfig.timeoutMs,
    dailyCostLimitUsd: modelConfig.dailyCostLimitUsd,
    userId: modelConfig.userId,
    reportId: modelConfig.reportId,
    agentName: "action",
  };

  const userPrompt = `## PROJECT CONTEXT (what the user is building)
${projectContext}

## VIDEO SUMMARY
${teacherMd.slice(0, 3000)}

## CONTENT ANALYSIS
Core Concept: ${analystOutput.core_concept}
Topic: ${analystOutput.topic_category}
Difficulty: ${analystOutput.estimated_difficulty}
Key Highlights:
${analystOutput.key_highlights.map((h, i) => `${i + 1}. ${h}`).join("\n")}
Mental Models: ${analystOutput.mental_models.join(", ")}
Warnings: ${analystOutput.warnings_and_mistakes.join(", ")}

Create an action plan where every task connects this specific video content to the user's specific project.`;

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
      agent: "action",
      reason: "JSON parse failed",
      raw: text.slice(0, 200),
    };
  }

  // Contract validation — exact lengths
  const today = parsed.today;
  const week = parsed.week;
  const metrics = parsed.metrics;

  if (!Array.isArray(today) || today.length !== 3) {
    throw { code: "contract_violation", agent: "action", field: "today", reason: `Expected 3 items, got ${Array.isArray(today) ? today.length : "non-array"}` };
  }
  if (!Array.isArray(week) || week.length !== 3) {
    throw { code: "contract_violation", agent: "action", field: "week", reason: `Expected 3 items, got ${Array.isArray(week) ? week.length : "non-array"}` };
  }
  if (!Array.isArray(metrics) || metrics.length !== 3) {
    throw { code: "contract_violation", agent: "action", field: "metrics", reason: `Expected 3 items, got ${Array.isArray(metrics) ? metrics.length : "non-array"}` };
  }
  if (typeof parsed.challenge !== "string" || !parsed.challenge.trim()) {
    throw { code: "contract_violation", agent: "action", field: "challenge", reason: "Missing or empty" };
  }
  if (typeof parsed.markdown !== "string" || !parsed.markdown.trim()) {
    throw { code: "contract_violation", agent: "action", field: "markdown", reason: "Missing or empty" };
  }

  return {
    data: {
      markdown: parsed.markdown as string,
      today: today as [string, string, string],
      week: week as [string, string, string],
      challenge: parsed.challenge as string,
      resources: (parsed.resources as string[]) ?? [],
      metrics: metrics as [string, string, string],
    },
    usedFallback,
  };
}
