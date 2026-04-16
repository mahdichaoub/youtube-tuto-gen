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

const EXPERTISE_ACTION_INSTRUCTIONS: Record<string, string> = {
  beginner: "The learner is a BEGINNER. Write tasks in plain language, assume no prior knowledge of this specific topic, explain why each step matters, and avoid technical shorthand.",
  intermediate: "The learner has INTERMEDIATE experience. Use standard terminology, assume basic domain knowledge, and focus on practical application without over-explaining.",
  advanced: "The learner is ADVANCED. Use precise technical language, skip explanations of fundamentals, focus on non-obvious implementation details and edge cases.",
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
- Return ONLY JSON

EXAMPLE OUTPUT (copy this exact structure — today has 3 objects, week has 3 objects, metrics has 3 strings):
{
  "hook": "Given you're building a SaaS analytics dashboard, Server Components just eliminated the biggest bottleneck in your stack — your client-side data waterfalls.",
  "mission_statement": "Move your slowest dashboard query into a Server Component and ship a measurably faster page today.",
  "markdown": "## Your 24h Mission\n...",
  "today": [
    {
      "label": "Move dashboard query to Server Component",
      "explanation": "Your current useEffect fetch is adding 800ms of waterfall to every page load. Moving it server-side eliminates that entirely.",
      "steps": ["Open your main dashboard component", "Create a new async Server Component for the query", "Move the fetch logic into it", "Replace the old component in the tree"]
    },
    {
      "label": "Add Suspense boundary with skeleton",
      "explanation": "Once the query is server-side, you can stream it — users see the page shell instantly instead of a blank screen.",
      "steps": ["Wrap the new Server Component in Suspense", "Build a skeleton that matches the real component's layout", "Test that the shell renders before data arrives", "Measure the perceived load time improvement"]
    },
    {
      "label": "Audit and remove unnecessary use client directives",
      "explanation": "Your dashboard likely has 'use client' on components that don't need it, bloating your JS bundle.",
      "steps": ["Search for every 'use client' in the dashboard route", "Remove it and see if the component still works", "Re-add only where interactivity breaks", "Check bundle size before and after"]
    }
  ],
  "week": [
    {
      "label": "Migrate all data fetching routes to Server Components",
      "explanation": "Apply the same pattern across every route in your dashboard to compound the performance gains.",
      "steps": ["List every route that fetches data client-side", "Migrate one per day starting with the slowest", "Write a test to confirm data loads correctly", "Document the pattern for your team"]
    },
    {
      "label": "Implement streaming for your heaviest analytics queries",
      "explanation": "Your most complex queries can stream progressively so users see partial results immediately.",
      "steps": ["Identify the 3 slowest queries in your app", "Wrap each in its own Server Component + Suspense", "Add granular skeleton states", "A/B test perceived performance"]
    },
    {
      "label": "Set up a bundle analysis baseline",
      "explanation": "Track the JS bundle reduction as you move more logic server-side — this becomes a key metric.",
      "steps": ["Run next build and note current bundle sizes", "Add @next/bundle-analyzer to your project", "Set a target bundle reduction goal", "Review after each Server Component migration"]
    }
  ],
  "challenge": "In 30 days, migrate every client-side data fetch in your SaaS dashboard to Server Components and reduce your JS bundle by 40%.",
  "resources": ["https://nextjs.org/docs/app/building-your-application/rendering/server-components", "https://react.dev/reference/react/Suspense"],
  "metrics": ["Time-to-first-meaningful-paint reduced by 500ms", "JS bundle size reduced by 30%+", "Zero useEffect data fetches remaining in dashboard routes"]
}`;

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
  detailLevel = 3,
  expertiseLevel: "beginner" | "intermediate" | "advanced" = "intermediate"
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
  const expertiseInstruction = EXPERTISE_ACTION_INSTRUCTIONS[expertiseLevel] ?? EXPERTISE_ACTION_INSTRUCTIONS.intermediate;

  const userPrompt = `STEP COUNT: Write exactly ${stepCount} steps per task.
LEARNER LEVEL: ${expertiseInstruction}


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

  // Contract validation — coerce length issues rather than throwing,
  // since LLMs occasionally return 4 items instead of 3.
  const rawToday = parsed.today;
  const rawWeek = parsed.week;
  const rawMetrics = parsed.metrics;

  if (!Array.isArray(rawToday) || rawToday.length < 1) {
    throw { code: "contract_violation", agent: "action", field: "today", reason: `Expected array, got ${Array.isArray(rawToday) ? 0 : "non-array"}` };
  }
  if (!Array.isArray(rawWeek) || rawWeek.length < 1) {
    throw { code: "contract_violation", agent: "action", field: "week", reason: `Expected array, got ${Array.isArray(rawWeek) ? 0 : "non-array"}` };
  }

  // Coerce to exactly 3 — slice if over, warn if under
  const today = rawToday.slice(0, 3) as unknown[];
  const week = rawWeek.slice(0, 3) as unknown[];
  if (today.length < 3) console.warn(`[action] today has ${today.length} items (expected 3)`);
  if (week.length < 3) console.warn(`[action] week has ${week.length} items (expected 3)`);

  // Validate each task object — coerce steps if needed
  for (const [listName, list] of [["today", today], ["week", week]] as [string, unknown[]][]) {
    for (let i = 0; i < list.length; i++) {
      const task = list[i] as Record<string, unknown>;
      if (typeof task.label !== "string" || !task.label.trim()) {
        throw { code: "contract_violation", agent: "action", field: `${listName}[${i}].label`, reason: "Missing or empty" };
      }
      if (typeof task.explanation !== "string" || !task.explanation.trim()) {
        (task as Record<string, unknown>).explanation = task.label; // fallback to label
      }
      if (!Array.isArray(task.steps) || (task.steps as string[]).length < 1) {
        (task as Record<string, unknown>).steps = [String(task.explanation ?? task.label)];
      } else if ((task.steps as string[]).length > 10) {
        (task as Record<string, unknown>).steps = (task.steps as string[]).slice(0, 10);
      }
    }
  }

  const metrics = Array.isArray(rawMetrics)
    ? (rawMetrics.slice(0, 3) as string[])
    : [];
  if (metrics.length < 3) console.warn(`[action] metrics has ${metrics.length} items (expected 3)`);

  if (typeof parsed.challenge !== "string" || !parsed.challenge.trim()) {
    throw { code: "contract_violation", agent: "action", field: "challenge", reason: "Missing or empty" };
  }
  if (typeof parsed.markdown !== "string" || !parsed.markdown.trim()) {
    throw { code: "contract_violation", agent: "action", field: "markdown", reason: "Missing or empty" };
  }
  if (typeof parsed.hook !== "string" || !parsed.hook.trim()) {
    throw { code: "contract_violation", agent: "action", field: "hook", reason: "Missing or empty" };
  }
  // mission_statement is optional — fall back to the hook
  const missionStatement = typeof parsed.mission_statement === "string" && parsed.mission_statement.trim()
    ? parsed.mission_statement
    : (parsed.hook as string);

  return {
    data: {
      hook: parsed.hook as string,
      mission_statement: missionStatement,
      markdown: parsed.markdown as string,
      today: today as [RichTask, RichTask, RichTask],
      week: week as [RichTask, RichTask, RichTask],
      challenge: parsed.challenge as string,
      resources: Array.isArray(parsed.resources) ? (parsed.resources as string[]) : [],
      metrics: metrics as [string, string, string],
    },
    usedFallback,
  };
}
