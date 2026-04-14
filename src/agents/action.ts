import { generateWithFallback, type GenerateConfig } from "@/lib/models/call";
import type { ModelConfig } from "./analyst";
import type { AnalystOutput } from "./analyst";
import type { ResearcherOutput } from "./researcher";

export interface RichTask {
  label: string;
  explanation: string;  // 1-2 sentences on why this task matters for their project
  steps: string[];      // how-to steps (count driven by detailLevel)
}

export interface ActionOutput {
  hook: string;             // "Given you're building X, here's why this changes everything..."
  mission_statement: string; // One bold, specific thing to ship today
  markdown: string;
  today: [RichTask, RichTask, RichTask];
  week: [RichTask, RichTask, RichTask];
  challenge: string;
  resources: string[];
  metrics: [string, string, string];
}

const DETAIL_STEP_COUNT: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 6,
  5: 8,
};

const SYSTEM_PROMPT = `You are a Skool-style learning coach creating a hyper-personalized 24h mission.

You will receive:
1. A teaching summary from a YouTube video
2. A structured content analysis with 3 key insights
3. Research findings with relevant resources
4. The user's PROJECT CONTEXT — what they are currently building
5. STEP COUNT — how many how-to steps to write per task

Your job: create an action plan where EVERY task is impossible to write without knowing BOTH:
- The specific content of this video
- The user's specific project

Generic tasks are CONTRACT VIOLATIONS. Every item must reference specific concepts from the video AND the user's project.

Return ONLY valid JSON (no markdown, no code fences):
{
  "hook": "string — 'Given you're building [specific project], [specific insight from this video] changes everything because...' (2-3 sentences, energetic, project-specific)",
  "mission_statement": "string — one bold, concrete thing they can ship or complete TODAY tied to both the video topic and their project",
  "markdown": "string — full action plan in Markdown format",
  "today": [
    {
      "label": "string — short task title (max 10 words)",
      "explanation": "string — 1-2 sentences on WHY this task matters for their specific project, referencing the video concept",
      "steps": ["Step 1: ...", "Step 2: ...", ...]
    }
  ],
  "week": [
    {
      "label": "string — short task title (max 10 words)",
      "explanation": "string — 1-2 sentences on WHY this task matters for their specific project",
      "steps": ["Step 1: ...", "Step 2: ...", ...]
    }
  ],
  "challenge": "string — one ambitious 30-day challenge",
  "resources": ["resource1", "resource2", ...],
  "metrics": ["metric1", "metric2", "metric3"]
}

Rules:
- hook: MUST name the user's specific project and reference a specific concept from the video
- mission_statement: one sentence, concrete and achievable in 2-4 hours, tied to their project
- today: EXACTLY 3 objects — each label must reference a specific video concept AND the user's project
- week: EXACTLY 3 objects — deeper tasks for the next 7 days, project-specific
- steps: EXACTLY the number specified in STEP COUNT — make each step concrete and actionable
- challenge: 1 string — ambitious but specific to their project
- resources: 2-5 strings — use researcher's found articles/docs when provided
- metrics: EXACTLY 3 strings — measurable, specific to their project
- Return ONLY JSON`;

/**
 * Action agent — creates a Skool-style project-specific 24h mission.
 * project_context is passed ONLY to this agent.
 */
export async function runAction(
  teacherMd: string,
  analystOutput: AnalystOutput,
  projectContext: string,
  modelConfig: ModelConfig,
  researcherOutput?: ResearcherOutput,
  detailLevel = 3
): Promise<{ data: ActionOutput; usedFallback: boolean }> {
  const config: GenerateConfig = {
    timeoutMs: modelConfig.timeoutMs,
    dailyCostLimitUsd: modelConfig.dailyCostLimitUsd,
    userId: modelConfig.userId,
    reportId: modelConfig.reportId,
    agentName: "action",
  };

  const resourcesSection = researcherOutput
    ? `\n## RESEARCH FINDINGS — use these in your resources list
Concept articles found:
${researcherOutput.concept_articles.map((a) => `- ${a.title} (${a.url}): ${a.summary}`).join("\n")}
Project docs found:
${researcherOutput.project_docs.map((d) => `- ${d.title} (${d.url}): ${d.summary}`).join("\n")}`
    : "";

  const stepCount = DETAIL_STEP_COUNT[detailLevel] ?? 4;

  const userPrompt = `STEP COUNT: Write exactly ${stepCount} steps per task.

## PROJECT CONTEXT (what the user is building)
${projectContext}

## VIDEO SUMMARY
${teacherMd.slice(0, 3000)}

## CONTENT ANALYSIS
Topic: ${analystOutput.topic_category}
Core Concept: ${analystOutput.core_concept}
Difficulty: ${analystOutput.estimated_difficulty}

3 Key Insights:
${analystOutput.key_insights.map((insight, i) =>
    `${i + 1}. ${insight.claim}\n   Example: ${insight.example}\n   Prevents: ${insight.mistake}`
  ).join("\n\n")}

Mental Models: ${analystOutput.mental_models.join(", ")}
Warnings: ${analystOutput.warnings_and_mistakes.join(", ")}${resourcesSection}

Create a 24h mission where every single task connects this specific video content to the user's specific project.`;

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

  // Contract validation
  const today = parsed.today;
  const week = parsed.week;
  const metrics = parsed.metrics;

  if (!Array.isArray(today) || today.length !== 3) {
    throw { code: "contract_violation", agent: "action", field: "today", reason: `Expected 3 items, got ${Array.isArray(today) ? today.length : "non-array"}` };
  }
  if (!Array.isArray(week) || week.length !== 3) {
    throw { code: "contract_violation", agent: "action", field: "week", reason: `Expected 3 items, got ${Array.isArray(week) ? week.length : "non-array"}` };
  }

  // Validate each task object
  for (const [listName, list] of [["today", today], ["week", week]] as [string, unknown[]][]) {
    for (let i = 0; i < list.length; i++) {
      const task = list[i] as Record<string, unknown>;
      if (typeof task.label !== "string" || !task.label.trim()) {
        throw { code: "contract_violation", agent: "action", field: `${listName}[${i}].label`, reason: "Missing or empty" };
      }
      if (typeof task.explanation !== "string" || !task.explanation.trim()) {
        throw { code: "contract_violation", agent: "action", field: `${listName}[${i}].explanation`, reason: "Missing or empty" };
      }
      if (!Array.isArray(task.steps) || (task.steps as string[]).length < 1) {
        throw { code: "contract_violation", agent: "action", field: `${listName}[${i}].steps`, reason: "Must be array with at least 1 item" };
      }
    }
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
  if (typeof parsed.hook !== "string" || !parsed.hook.trim()) {
    throw { code: "contract_violation", agent: "action", field: "hook", reason: "Missing or empty" };
  }
  if (typeof parsed.mission_statement !== "string" || !parsed.mission_statement.trim()) {
    throw { code: "contract_violation", agent: "action", field: "mission_statement", reason: "Missing or empty" };
  }

  return {
    data: {
      hook: parsed.hook as string,
      mission_statement: parsed.mission_statement as string,
      markdown: parsed.markdown as string,
      today: today as [RichTask, RichTask, RichTask],
      week: week as [RichTask, RichTask, RichTask],
      challenge: parsed.challenge as string,
      resources: (parsed.resources as string[]) ?? [],
      metrics: metrics as [string, string, string],
    },
    usedFallback,
  };
}
