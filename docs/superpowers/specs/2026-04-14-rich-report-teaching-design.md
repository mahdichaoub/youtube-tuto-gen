# Rich Report Teaching & Action Plan Design

**Date:** 2026-04-14
**Branch:** 002-learnagent-pipeline-build
**Status:** Approved

---

## Problem

The current report feels like a bullet-point summary, not a teacher guiding you through material. Action items are labels — they tell you *what* to do but not *how*. There is no sense of progress, and detail is one-size-fits-all.

---

## Goals

1. Teaching sections feel like a knowledgeable person walking you through the concept.
2. Every action item is expandable — shows a brief explanation and numbered how-to steps.
3. A progress bar tracks cumulative task completion (Today + This Week) on the report, no reset.
4. A 1–5 detail level control lets users set how many steps the AI writes per task on the *next* report.

---

## Out of Scope

- Retroactively regenerating existing reports at a new detail level.
- Per-task detail level overrides (global preference only).
- Teacher agent prompt changes (structured enrichment comes from the analyst, not the teacher).

---

## Approach

Enrich new reports with richer AI-generated data. Old reports degrade gracefully — they render exactly as today. The UI checks for the presence of `steps` / `deep_dive` fields before showing expandable UI.

---

## Data Model Changes

### Analyst agent output (`src/agents/analyst.ts`)

Each item in `key_insights` gains two new required fields:

```ts
{
  claim: string;
  example: string;
  mistake: string;
  deep_dive: string;       // NEW: 2–3 sentences explaining why the claim is true
  how_to_apply: string[];  // NEW: 2–4 concrete steps to apply it to the user's build
}
```

Two new fields are added to the top-level analyst output:

```ts
{
  // ...existing fields...
  analogy: string;          // NEW: one analogy that makes the core concept click
  common_mistake: string;   // NEW: the most common mistake people make with this concept
}
```

Contract validation must require all new fields. Old fields are unchanged.

### Action agent output (`src/agents/action.ts`)

`today` and `week` items change from `string` to a richer object:

```ts
{
  label: string;        // same as current — the task title
  explanation: string;  // NEW: 1–2 sentences on why this task matters for their project
  steps: string[];      // NEW: N how-to steps, where N is driven by detailLevel
}
```

**Detail level → step count mapping:**

| detailLevel | steps per task |
|---|---|
| 1 | 2 |
| 2 | 3 |
| 3 | 4 (default) |
| 4 | 6 |
| 5 | 8 |

Contract validation must require `label`, `explanation`, and `steps` (min 1 item) on each task object.

### Database — `user` table (`src/lib/schema.ts`)

Add one column:

```ts
detailLevel: integer("detail_level").default(3).notNull()
```

No new tables. No migration needed for existing Better Auth tables — Drizzle `db:push` handles the additive column.

---

## New API Endpoint

### `PATCH /api/preferences`

Saves the user's detail level preference.

- **Auth:** `requireAuth()` — 401 if not authenticated
- **Body:** `{ detailLevel: 1 | 2 | 3 | 4 | 5 }`
- **Validation:** must be integer 1–5, reject otherwise with 400
- **Response:** `{ detailLevel: number }`
- **File:** `src/app/api/preferences/route.ts`

---

## Orchestrator Changes (`src/agents/orchestrator.ts`)

At pipeline start, fetch the user's `detailLevel` from the DB:

```ts
const user = await db.query.user.findFirst({ where: eq(user.id, userId) });
const detailLevel = user?.detailLevel ?? 3;
```

Pass `detailLevel` into `runAction(...)` as a new parameter.

---

## UI Components

### `MissionSection.tsx` — 3 additions

**1. Detail level selector (top of section)**

A row of 5 pill buttons labeled 1–5. Active pill is highlighted. On click:
- Optimistically updates local state
- Calls `PATCH /api/preferences`
- Shows a subtle toast: "Level X — your next report will use this detail"

Label above pills: "Action detail level" with a helper note "(applies to your next report)"

**2. Progress bar (below detail selector)**

```
X of Y tasks completed  [████████░░░░░░░] 60%
```

- Counts all Today + Week tasks (combined)
- Updates live as checkboxes are toggled
- No reset — cumulative for this report's lifetime
- Uses a simple `<div>` with a width percentage, styled with Tailwind

**3. Expandable task rows**

Each task row gets a chevron (`›`) on the right. Clicking toggles a panel below:

```
[✓] Ship the auth middleware refactor               ›
    ↳ This connects the JWT rotation concept from the video directly to your
      current auth layer, reducing the surface for token reuse attacks.
      
      1. Open src/lib/auth.ts and locate the session handler
      2. Add a rotation check after token validation
      3. Write a test that replays a rotated token and expects 401
      4. Deploy behind the existing feature flag
```

- Collapsed by default
- Old tasks (plain string labels, no `steps` field) show no chevron — render as today
- The `explanation` renders as italic muted text
- The `steps` render as a numbered list

### `BigIdeaSection.tsx` — guided walkthrough

Replace the current single `explanation` block with structured sub-sections:

```
💡 The Big Idea
━━━━━━━━━━━━━━
[core_concept — bold headline]

[big_idea_prompt — italic lead-in, if present]

[explanation — prose]

The Analogy
[analogy — indented, slightly muted]

Where People Go Wrong
[common_mistake — amber/warning tint]
```

Old reports without `analogy` / `common_mistake` skip those sub-sections silently.

### `InsightsSection.tsx` — expandable insight cards

Each insight card gets a **"How to apply →"** toggle link at the bottom. Clicking expands:

```
[claim — bold]
Example: [example]
Avoids:  [mistake]

▼ How to apply
  [deep_dive — 2–3 sentence prose]
  
  1. [how_to_apply[0]]
  2. [how_to_apply[1]]
  ...
```

- Collapsed by default
- Old insights without `deep_dive` / `how_to_apply` show no toggle
- One card can be open at a time (accordion behavior) — or all independent (simpler). Use independent — no accordion complexity needed.

---

## Backward Compatibility

| Field | Old report behavior | New report behavior |
|---|---|---|
| `task.steps` | undefined — no chevron rendered | present — chevron + expansion |
| `insight.deep_dive` | undefined — no toggle rendered | present — "How to apply" toggle |
| `concept.analogy` | undefined — sub-section skipped | present — rendered |
| `concept.common_mistake` | undefined — sub-section skipped | present — rendered |

No old report breaks. Every new field is optional in the UI rendering layer.

---

## File Change Summary

| File | Change |
|---|---|
| `src/agents/analyst.ts` | Add `analogy`, `common_mistake` to output; add `deep_dive`, `how_to_apply` to each insight |
| `src/agents/action.ts` | Task items → `{ label, explanation, steps[] }`; accept `detailLevel` param |
| `src/agents/orchestrator.ts` | Fetch user `detailLevel`; pass to `runAction` |
| `src/lib/schema.ts` | Add `detailLevel` column to `user` table |
| `src/app/api/preferences/route.ts` | New file — PATCH endpoint |
| `src/components/report/MissionSection.tsx` | Detail selector + progress bar + expandable rows |
| `src/components/report/InsightsSection.tsx` | Expandable cards with `deep_dive` + `how_to_apply` |
| `src/components/report/BigIdeaSection.tsx` | Guided walkthrough with `analogy` + `common_mistake` |

---

## Success Criteria

1. Generate a new report → action items have chevrons → expanding shows explanation + numbered steps
2. Progress bar fills correctly as tasks are checked — survives page reload (tasks are persisted)
3. Selecting detail level 5 and generating a new report produces ~8 steps per task
4. Old reports render without errors — no missing sections, no broken UI
5. `BigIdeaSection` shows "The Analogy" and "Where People Go Wrong" sub-sections on new reports
6. Each insight card shows "How to apply" toggle on new reports
