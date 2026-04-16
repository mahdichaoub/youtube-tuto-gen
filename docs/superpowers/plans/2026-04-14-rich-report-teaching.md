# Rich Report Teaching & Action Plan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make reports feel like a real teacher guiding you — expandable how-to steps per action item, a progress bar, a 1–5 detail level preference, and richer Big Idea + Insight sections.

**Architecture:** Enrich analyst and action agent outputs with new fields (`analogy`, `common_mistake`, `deep_dive`, `how_to_apply`, task `explanation` + `steps[]`). Store a `detailLevel` user preference in a new `userPreferences` table. UI components check for new fields and show expanded UI if present; old reports degrade gracefully.

**Tech Stack:** Next.js 14 App Router, TypeScript, Drizzle ORM (PostgreSQL), `@anthropic-ai/sdk`, Tailwind CSS, shadcn/ui

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/schema.ts` | Modify | Add `userPreferences` table |
| `src/app/api/preferences/route.ts` | Create | GET + PATCH user detail level preference |
| `src/agents/analyst.ts` | Modify | Add `analogy`, `common_mistake`, `deep_dive`, `how_to_apply` to output |
| `src/agents/action.ts` | Modify | Task items → `{ label, explanation, steps[] }`, accept `detailLevel` |
| `src/agents/orchestrator.ts` | Modify | Fetch `detailLevel`, pass to `runAction`, fix task saving, save new analyst fields |
| `src/components/report/BigIdeaSection.tsx` | Modify | Add `analogy` + `common_mistake` guided walkthrough sub-sections |
| `src/components/report/InsightsSection.tsx` | Modify | Expandable cards with `deep_dive` + `how_to_apply` |
| `src/components/report/MissionSection.tsx` | Modify | Detail level selector + progress bar + expandable task rows |
| `src/app/(app)/report/[id]/page.tsx` | Modify | Update type definitions for new fields |

---

## Task 1: Add `userPreferences` table

**Files:**
- Modify: `src/lib/schema.ts`

- [ ] **Step 1: Add the table definition**

In `src/lib/schema.ts`, add after the `streaks` table (before `// ─── LearnAgent Model Selection Tables`):

```ts
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  detailLevel: integer("detail_level").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Push schema to DB**

```bash
pnpm db:push
```

Expected: Drizzle prints `Your schema is now in sync with the database` or shows `userPreferences` table created.

- [ ] **Step 3: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/schema.ts
git commit -m "feat: add userPreferences table with detailLevel"
```

---

## Task 2: Create preferences API

**Files:**
- Create: `src/app/api/preferences/route.ts`

- [ ] **Step 1: Create the route file**

```ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await requireAuth();
  const row = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, session.user.id),
  });
  return NextResponse.json({ detailLevel: row?.detailLevel ?? 3 });
}

export async function PATCH(req: Request) {
  const session = await requireAuth();
  const body = await req.json();
  const level = Number(body.detailLevel);
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    return NextResponse.json({ error: "detailLevel must be 1–5" }, { status: 400 });
  }

  await db
    .insert(userPreferences)
    .values({ userId: session.user.id, detailLevel: level })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { detailLevel: level, updatedAt: new Date() },
    });

  return NextResponse.json({ detailLevel: level });
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/preferences/route.ts
git commit -m "feat: add GET/PATCH /api/preferences for detail level"
```

---

## Task 3: Enrich analyst agent output

**Files:**
- Modify: `src/agents/analyst.ts`

- [ ] **Step 1: Update `KeyInsight` interface**

Replace the existing `KeyInsight` interface:

```ts
export interface KeyInsight {
  claim: string;
  example: string;
  mistake: string;
  deep_dive: string;       // 2–3 sentences on WHY the claim is true
  how_to_apply: string[];  // 2–4 concrete steps to apply to the user's build
}
```

- [ ] **Step 2: Update `AnalystOutput` interface**

Add two fields after `key_insights`:

```ts
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
```

- [ ] **Step 3: Update the system prompt**

Replace the `SYSTEM_PROMPT` constant with:

```ts
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
```

- [ ] **Step 4: Update contract validation**

After the existing `requiredStrings` validation block (after the `for` loop), add:

```ts
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
for (let i = 0; i < (insights as KeyInsight[]).length; i++) {
  const insight = (insights as Record<string, unknown>[])[i];
  if (typeof insight.deep_dive !== "string" || !(insight.deep_dive as string).trim()) {
    throw {
      code: "contract_violation",
      agent: "analyst",
      field: `key_insights[${i}].deep_dive`,
      reason: "Missing or empty",
    };
  }
  if (!Array.isArray(insight.how_to_apply) || (insight.how_to_apply as string[]).length < 2) {
    throw {
      code: "contract_violation",
      agent: "analyst",
      field: `key_insights[${i}].how_to_apply`,
      reason: "Must be array with at least 2 items",
    };
  }
}
```

- [ ] **Step 5: Update the return object**

In the `return` statement at the bottom of `runAnalyst`, add the two new fields:

```ts
return {
  video_id: parsed.video_id as string,
  hook: parsed.hook as string,
  core_concept: parsed.core_concept as string,
  big_idea_prompt: parsed.big_idea_prompt as string,
  analogy: parsed.analogy as string,                     // NEW
  common_mistake: parsed.common_mistake as string,        // NEW
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
```

- [ ] **Step 6: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/agents/analyst.ts
git commit -m "feat: enrich analyst output with analogy, common_mistake, deep_dive, how_to_apply"
```

---

## Task 4: Enrich action agent — richer tasks + detailLevel

**Files:**
- Modify: `src/agents/action.ts`

- [ ] **Step 1: Add `RichTask` interface and update `ActionOutput`**

Add the `RichTask` interface before `ActionOutput`, and update `ActionOutput`:

```ts
export interface RichTask {
  label: string;
  explanation: string;  // 1-2 sentences on why this task matters for their project
  steps: string[];      // how-to steps (count driven by detailLevel)
}

export interface ActionOutput {
  hook: string;
  mission_statement: string;
  markdown: string;
  today: [RichTask, RichTask, RichTask];
  week: [RichTask, RichTask, RichTask];
  challenge: string;
  resources: string[];
  metrics: [string, string, string];
}
```

- [ ] **Step 2: Add the detail level step-count map**

Add this constant after the imports:

```ts
const DETAIL_STEP_COUNT: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 6,
  5: 8,
};
```

- [ ] **Step 3: Update `SYSTEM_PROMPT` to output rich task objects**

Replace the `SYSTEM_PROMPT` constant:

```ts
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
```

- [ ] **Step 4: Update `runAction` signature to accept `detailLevel`**

Change the function signature:

```ts
export async function runAction(
  teacherMd: string,
  analystOutput: AnalystOutput,
  projectContext: string,
  modelConfig: ModelConfig,
  researcherOutput?: ResearcherOutput,
  detailLevel = 3
): Promise<{ data: ActionOutput; usedFallback: boolean }> {
```

- [ ] **Step 5: Inject step count into the user prompt**

In the `userPrompt` template string, add at the very top before `## PROJECT CONTEXT`:

```ts
const stepCount = DETAIL_STEP_COUNT[detailLevel] ?? 4;

const userPrompt = `STEP COUNT: Write exactly ${stepCount} steps per task.

## PROJECT CONTEXT (what the user is building)
${projectContext}
// ... rest unchanged
```

- [ ] **Step 6: Update contract validation for rich tasks**

Replace the existing `today`/`week` validation:

```ts
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
```

- [ ] **Step 7: Update the return statement**

```ts
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
```

- [ ] **Step 8: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: No errors. (The orchestrator will show errors until Task 5 — that's expected for now.)

- [ ] **Step 9: Commit**

```bash
git add src/agents/action.ts
git commit -m "feat: action agent outputs rich task objects with explanation + steps, accepts detailLevel"
```

---

## Task 5: Update orchestrator

**Files:**
- Modify: `src/agents/orchestrator.ts`

- [ ] **Step 1: Add `userPreferences` import**

Add to the existing imports at the top:

```ts
import { userPreferences } from "@/lib/schema";
```

- [ ] **Step 2: Fetch `detailLevel` after loading model config**

After the line `const mc = { ...modelConfig, userId, reportId };`, add:

```ts
// Fetch user detail level preference (default 3)
const prefRow = await db.query.userPreferences.findFirst({
  where: eq(userPreferences.userId, userId),
});
const detailLevel = prefRow?.detailLevel ?? 3;
```

- [ ] **Step 3: Pass `detailLevel` to `runAction`**

Update the `runAction` call (around line 133):

```ts
const actionOutput = await runAction(
  teacherOutput.markdown,
  analystOutput,
  projectContext,
  mc,
  researcherOutput,
  detailLevel   // NEW
);
```

- [ ] **Step 4: Add `analogy` and `common_mistake` to the concept section JSON**

In the `sectionRows` array, update the `concept` section's `contentJson`:

```ts
{
  reportId,
  sectionType: "concept",
  contentJson: {
    hook: analystOutput.hook,
    core_concept: analystOutput.core_concept,
    big_idea_prompt: analystOutput.big_idea_prompt,
    analogy: analystOutput.analogy,                  // NEW
    common_mistake: analystOutput.common_mistake,    // NEW
    explanation: (() => {
      const text = teacherOutput.markdown;
      const start = text.indexOf("## 💡 The Big Idea");
      const end = text.indexOf("## ⚡", start);
      if (start === -1) return analystOutput.core_concept;
      return end !== -1
        ? text.slice(start + "## 💡 The Big Idea".length, end).trim()
        : text.slice(start + "## 💡 The Big Idea".length).trim();
    })(),
    why_matters: (() => {
      const text = teacherOutput.markdown;
      const start = text.indexOf("## 🔥 Why This Matters To You");
      const end = text.indexOf("## 💡", start);
      if (start === -1) return "";
      return end !== -1
        ? text.slice(start + "## 🔥 Why This Matters To You".length, end).trim()
        : text.slice(start + "## 🔥 Why This Matters To You".length).trim();
    })(),
  },
},
```

- [ ] **Step 5: Fix task saving loop to extract label from rich task objects**

Replace the existing `taskRows` block:

```ts
const taskRows = [
  ...actionOutput.data.today.map((task) => ({
    reportId,
    userId,
    label: task.label,
    scope: "today" as const,
  })),
  ...actionOutput.data.week.map((task) => ({
    reportId,
    userId,
    label: task.label,
    scope: "week" as const,
  })),
];
```

- [ ] **Step 6: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/agents/orchestrator.ts
git commit -m "feat: orchestrator fetches detailLevel, passes to action agent, saves analogy/common_mistake"
```

---

## Task 6: Update `BigIdeaSection` — guided walkthrough

**Files:**
- Modify: `src/components/report/BigIdeaSection.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire file:

```tsx
interface BigIdeaSectionProps {
  coreConcept: string;
  explanation: string;
  bigIdeaPrompt?: string;
  analogy?: string;
  commonMistake?: string;
}

export function BigIdeaSection({
  coreConcept,
  explanation,
  bigIdeaPrompt,
  analogy,
  commonMistake,
}: BigIdeaSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        💡 The Big Idea
      </p>
      <p className="text-base font-semibold leading-snug">{coreConcept}</p>

      {bigIdeaPrompt && (
        <p className="text-sm text-muted-foreground italic">{bigIdeaPrompt}</p>
      )}

      {explanation && (
        <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {explanation}
        </div>
      )}

      {analogy && (
        <div className="rounded-lg bg-muted/60 border border-border px-4 py-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            The Analogy
          </p>
          <p className="text-sm leading-relaxed text-foreground/80 italic">{analogy}</p>
        </div>
      )}

      {commonMistake && (
        <div className="rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Where People Go Wrong
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">{commonMistake}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: No errors (the report page will show type errors until Task 9 — acceptable for now).

- [ ] **Step 3: Commit**

```bash
git add src/components/report/BigIdeaSection.tsx
git commit -m "feat: BigIdeaSection shows analogy and common_mistake guided walkthrough"
```

---

## Task 7: Update `InsightsSection` — expandable cards

**Files:**
- Modify: `src/components/report/InsightsSection.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire file:

```tsx
"use client";

import { useState } from "react";

const ACCENT_COLORS = [
  "border-l-violet-500",
  "border-l-purple-500",
  "border-l-pink-500",
];

interface KeyInsight {
  claim: string;
  example: string;
  mistake: string;
  deep_dive?: string;
  how_to_apply?: string[];
}

interface InsightsSectionProps {
  insights: KeyInsight[];
}

export function InsightsSection({ insights }: InsightsSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!insights || insights.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        ⚡ 3 Insights That Change How You Build
      </p>
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const isOpen = openIndex === i;
          const hasExpansion = insight.deep_dive || (insight.how_to_apply && insight.how_to_apply.length > 0);

          return (
            <div
              key={i}
              className={`rounded-lg bg-background border-l-4 ${ACCENT_COLORS[i % 3]} p-4 space-y-1.5`}
            >
              <p className="text-sm font-semibold leading-snug">{insight.claim}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground/70 font-medium">Example: </span>
                {insight.example}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground/70 font-medium">Avoids: </span>
                {insight.mistake}
              </p>

              {hasExpansion && (
                <>
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="text-xs font-medium text-primary hover:underline mt-1 flex items-center gap-1"
                  >
                    {isOpen ? "Hide" : "How to apply"}{" "}
                    <span className={`transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>
                  </button>

                  {isOpen && (
                    <div className="mt-2 space-y-2 border-t border-border pt-2">
                      {insight.deep_dive && (
                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                          {insight.deep_dive}
                        </p>
                      )}
                      {insight.how_to_apply && insight.how_to_apply.length > 0 && (
                        <ol className="space-y-1">
                          {insight.how_to_apply.map((step, j) => (
                            <li key={j} className="flex gap-2 text-xs text-foreground/80">
                              <span className="font-semibold text-primary flex-shrink-0">
                                {j + 1}.
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/report/InsightsSection.tsx
git commit -m "feat: InsightsSection expandable cards with deep_dive and how_to_apply"
```

---

## Task 8: Update `MissionSection` — detail selector + progress bar + expandable task rows

**Files:**
- Modify: `src/components/report/MissionSection.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire file:

```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useStreak } from "@/contexts/StreakContext";

export interface RichTask {
  label: string;
  explanation?: string;
  steps?: string[];
}

export interface ActionOutput {
  hook: string;
  mission_statement: string;
  markdown: string;
  today: [string | RichTask, string | RichTask, string | RichTask];
  week: [string | RichTask, string | RichTask, string | RichTask];
  challenge: string;
  resources: string[];
  metrics: [string, string, string];
}

export interface TaskItem {
  id: string;
  label: string;
  scope: "today" | "week" | "month";
  completed: boolean;
  completedAt: string | null;
}

function getLabel(task: string | RichTask): string {
  return typeof task === "string" ? task : task.label;
}

function getExpansion(task: string | RichTask): { explanation?: string; steps?: string[] } {
  if (typeof task === "string") return {};
  return { explanation: task.explanation, steps: task.steps };
}

function TaskRow({
  task,
  richTask,
  onToggle,
}: {
  task: TaskItem;
  richTask: string | RichTask;
  onToggle: (id: string, streak: { currentStreak: number }) => void;
}) {
  const [checked, setChecked] = useState(task.completed);
  const [pending, setPending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isStatic = task.id.startsWith("today-") || task.id.startsWith("week-");
  const { explanation, steps } = getExpansion(richTask);
  const hasExpansion = explanation || (steps && steps.length > 0);

  const handleChange = useCallback(async () => {
    if (pending || isStatic) return;
    const next = !checked;
    setChecked(next);
    setPending(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: next }),
      });
      if (res.ok) {
        const data = await res.json();
        onToggle(task.id, data.streak);
      } else {
        setChecked(!next);
      }
    } catch {
      setChecked(!next);
    } finally {
      setPending(false);
    }
  }, [checked, pending, task.id, onToggle, isStatic]);

  return (
    <li className="space-y-1">
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={pending || isStatic}
          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border accent-green-500 cursor-pointer disabled:cursor-default"
        />
        <span
          className={`text-sm flex-1 ${checked ? "line-through text-muted-foreground" : "text-foreground/90"}`}
        >
          {getLabel(richTask)}
        </span>
        {hasExpansion && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground flex-shrink-0 transition-transform"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            ›
          </button>
        )}
      </div>

      {hasExpansion && expanded && (
        <div className="ml-6 rounded-lg bg-muted/40 border border-border p-3 space-y-2">
          {explanation && (
            <p className="text-xs text-muted-foreground italic leading-relaxed">
              {explanation}
            </p>
          )}
          {steps && steps.length > 0 && (
            <ol className="space-y-1">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-foreground/80">
                  <span className="font-semibold text-primary flex-shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </li>
  );
}

interface MissionSectionProps {
  actions: ActionOutput;
  tasks: TaskItem[];
}

const DETAIL_LABELS: Record<number, string> = {
  1: "Brief",
  2: "Standard",
  3: "Detailed",
  4: "Deep",
  5: "Expert",
};

export function MissionSection({ actions, tasks }: MissionSectionProps) {
  const { setCurrentStreak } = useStreak();
  const [detailLevel, setDetailLevel] = useState(3);
  const [savingDetail, setSavingDetail] = useState(false);
  const [detailSaved, setDetailSaved] = useState(false);

  // Completion tracking for progress bar
  const [completionMap, setCompletionMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    tasks.forEach((t) => { map[t.id] = t.completed; });
    return map;
  });

  // Load saved detail level
  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((d) => { if (d.detailLevel) setDetailLevel(d.detailLevel); })
      .catch(() => {});
  }, []);

  const handleDetailChange = useCallback(async (level: number) => {
    setDetailLevel(level);
    setSavingDetail(true);
    try {
      await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detailLevel: level }),
      });
      setDetailSaved(true);
      setTimeout(() => setDetailSaved(false), 2000);
    } catch {
      // best effort
    } finally {
      setSavingDetail(false);
    }
  }, []);

  const todayTasks = tasks.filter((t) => t.scope === "today");
  const weekTasks = tasks.filter((t) => t.scope === "week");

  const todayList =
    todayTasks.length > 0
      ? todayTasks
      : actions.today.map((task, i) => ({
          id: `today-${i}`,
          label: getLabel(task),
          scope: "today" as const,
          completed: false,
          completedAt: null,
        }));

  const weekList =
    weekTasks.length > 0
      ? weekTasks
      : actions.week.map((task, i) => ({
          id: `week-${i}`,
          label: getLabel(task),
          scope: "week" as const,
          completed: false,
          completedAt: null,
        }));

  const handleToggle = useCallback(
    (taskId: string, streak: { currentStreak: number }) => {
      setCurrentStreak(streak.currentStreak);
      setCompletionMap((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
    },
    [setCurrentStreak]
  );

  // Progress bar
  const allTaskIds = [...todayList, ...weekList].map((t) => t.id);
  const completedCount = allTaskIds.filter((id) => completionMap[id]).length;
  const totalCount = allTaskIds.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Hook */}
      {actions.hook && (
        <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200 mb-2">
            🎯 Your 24h Mission
          </p>
          <p className="text-base font-semibold leading-snug text-white mb-2">
            {actions.mission_statement}
          </p>
          <p className="text-sm leading-relaxed text-emerald-100">{actions.hook}</p>
        </div>
      )}

      {/* Detail level selector */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Action detail level
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Applies to your next report
            </p>
          </div>
          {detailSaved && (
            <span className="text-xs text-green-500 font-medium">Saved</span>
          )}
          {savingDetail && !detailSaved && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => handleDetailChange(level)}
              className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                detailLevel === level
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              <span className="block">{level}</span>
              <span className="block text-[10px] font-normal opacity-70">{DETAIL_LABELS[level]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Progress
          </p>
          <p className="text-xs text-muted-foreground">
            {completedCount} of {totalCount} tasks
          </p>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-right">{progressPct}%</p>
      </div>

      {/* Today tasks */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Do Today
        </p>
        <ul className="space-y-3">
          {todayList.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              richTask={actions.today[i] ?? task.label}
              onToggle={handleToggle}
            />
          ))}
        </ul>
      </div>

      {/* This Week */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          This Week
        </p>
        <ul className="space-y-3">
          {weekList.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              richTask={actions.week[i] ?? task.label}
              onToggle={handleToggle}
            />
          ))}
        </ul>
      </div>

      {/* 30-Day Challenge */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">
          30-Day Challenge
        </p>
        <p className="text-sm leading-relaxed">{actions.challenge}</p>
      </div>

      {/* Resources */}
      {actions.resources.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Resources
          </p>
          <ul className="space-y-1.5">
            {actions.resources.map((resource, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-muted-foreground mt-0.5">→</span>
                <span>{resource}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metrics */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          How to Know It&apos;s Working
        </p>
        <ul className="space-y-2">
          {actions.metrics.map((metric, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-green-500 font-bold mt-0.5">✓</span>
              <span>{metric}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/report/MissionSection.tsx
git commit -m "feat: MissionSection adds detail selector, progress bar, and expandable task rows"
```

---

## Task 9: Update report page type definitions

**Files:**
- Modify: `src/app/(app)/report/[id]/page.tsx`

- [ ] **Step 1: Update `KeyInsight` interface**

Replace the existing `KeyInsight` interface at the top of the file:

```ts
interface KeyInsight {
  claim: string;
  example: string;
  mistake: string;
  deep_dive?: string;
  how_to_apply?: string[];
}
```

- [ ] **Step 2: Update the `concept` type in `ReportData`**

In the `sections` object inside `ReportData`, update `concept`:

```ts
concept?: {
  hook?: string;
  core_concept: string;
  big_idea_prompt?: string;
  explanation: string;
  why_matters?: string;
  analogy?: string;
  common_mistake?: string;
};
```

- [ ] **Step 3: Update the `actions` type in `ReportData`**

Import `RichTask` from `MissionSection` and update `ActionOutput` usage. First, update the import line at the top:

```ts
import type { ActionOutput, TaskItem } from "@/components/report/MissionSection";
```

Then inside `ReportData.sections`, the `actions` type is already `ActionOutput` — since `MissionSection` now exports an updated `ActionOutput` with `string | RichTask` task items, this is automatically correct.

- [ ] **Step 4: Pass `analogy` and `commonMistake` to `BigIdeaSection`**

Update the `BigIdeaSection` render call in the JSX (around line 121):

```tsx
{concept && (
  <BigIdeaSection
    coreConcept={concept.core_concept}
    explanation={concept.explanation}
    bigIdeaPrompt={concept.big_idea_prompt}
    analogy={concept.analogy}
    commonMistake={concept.common_mistake}
  />
)}
```

- [ ] **Step 5: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 6: Run lint**

```bash
pnpm lint
```

Expected: No errors or only pre-existing warnings.

- [ ] **Step 7: Commit**

```bash
git add src/app/(app)/report/[id]/page.tsx
git commit -m "feat: report page passes analogy, common_mistake, rich task types to components"
```

---

## Verification Checklist

After all tasks complete, verify end-to-end:

- [ ] `pnpm typecheck` — zero errors
- [ ] `pnpm lint` — zero new errors
- [ ] `pnpm db:push` — schema in sync
- [ ] Generate a new report → action items have `›` chevrons → clicking shows explanation + numbered steps
- [ ] Progress bar fills as tasks are checked, survives page reload
- [ ] Selecting detail level 5 → saved toast appears → next report generates ~8 steps per task
- [ ] Old reports render without errors — no broken sections
- [ ] `BigIdeaSection` shows "The Analogy" and "Where People Go Wrong" on new reports
- [ ] Each insight shows "How to apply" toggle on new reports; old insights show none
