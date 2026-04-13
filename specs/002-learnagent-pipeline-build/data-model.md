# Data Model: LearnAgent Pipeline Build

**Phase**: 1 — Design & Contracts
**Source**: `spec.md` (clarified), `research.md`, existing boilerplate `src/lib/schema.ts`
**Date**: 2026-04-13

---

## Foundation: Existing Better Auth Tables (DO NOT MODIFY)

The boilerplate schema in `src/lib/schema.ts` defines four tables managed by Better Auth:
`user`, `session`, `account`, `verification`. All LearnAgent tables reference `user.id`
(type `text`) as their foreign key — not UUID.

**Critical**: Better Auth user IDs are `text`, not `uuid`. All `userId` columns below
are `text` to match.

---

## New Entities (add to `src/lib/schema.ts`)

### 1. Report

The primary aggregate. One report per submission (URL + project context + user).

```typescript
export const reports = pgTable(
  "reports",
  {
    id:                  uuid("id").primaryKey().defaultRandom(),
    userId:              text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    videoId:             text("video_id").notNull(),
    videoUrl:            text("video_url").notNull(),
    title:               text("title"),
    topicCategory:       text("topic_category"),
    estimatedDifficulty: text("estimated_difficulty"),
    projectContext:      text("project_context").notNull(),
    status:              text("status").notNull().default("fetching"),
    isShared:            boolean("is_shared").notNull().default(false),
    createdAt:           timestamp("created_at").defaultNow().notNull(),
    updatedAt:           timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("reports_user_id_idx").on(table.userId),
    index("reports_created_at_idx").on(table.createdAt),
  ]
);
```

**Status lifecycle** (internal values — NEVER display verbatim in UI):
```
fetching → analyzing → teaching → planning → complete
                                            ↘ failed
```

**Validation**:
- `videoId`: MUST match `^[a-zA-Z0-9_-]{11}$`
- `projectContext`: MUST be non-empty after trim; UI enforces ≥10 chars
- `estimatedDifficulty`: MUST be one of `beginner | intermediate | advanced` (or null during generation)
- `status`: MUST be one of `fetching | analyzing | teaching | planning | complete | failed`
- `isShared`: `false` by default; set to `true` only by explicit user action

---

### 2. ReportSection

One row per content section per report. Five section types map to the five report tab cards.

```typescript
export const reportSections = pgTable(
  "report_sections",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    reportId:    uuid("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
    sectionType: text("section_type").notNull(),
    contentJson: jsonb("content_json").notNull(),
    createdAt:   timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("report_sections_report_id_idx").on(table.reportId),
  ]
);
```

**`sectionType` values**: `concept | highlights | models | examples | actions`

**`contentJson` schema per section type**:

```
concept:    { "core_concept": "string", "explanation": "string" }

highlights: { "items": ["string", ...] }  ← 5–7 items

models:     { "items": [{ "name": "string", "description": "string" }, ...] }

examples:   { "items": ["string", ...] }

actions:    {
              "markdown": "string",         ← full Action Agent output
              "today": ["string", ...],     ← exactly 3 items
              "week": ["string", ...],      ← exactly 3 items
              "challenge": "string",        ← exactly 1 item
              "resources": ["string", ...],
              "metrics": ["string", ...]    ← exactly 3 items
            }
```

**Access rule**: A user may read a `reportSection` only if the parent `reports.userId` matches
their session user ID (enforced in every Drizzle query via JOIN + WHERE clause).

---

### 3. Task

Individual actionable items from the action plan. Supports completion tracking and streak.

```typescript
export const tasks = pgTable(
  "tasks",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    reportId:    uuid("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
    userId:      text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    label:       text("label").notNull(),
    scope:       text("scope").notNull(),
    completed:   boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at"),
    createdAt:   timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tasks_user_id_idx").on(table.userId),
    index("tasks_report_id_idx").on(table.reportId),
    index("tasks_completed_at_idx").on(table.completedAt),
  ]
);
```

**`scope` values**: `today | week | month`

**Completion rule**:
- Setting `completed = true` MUST set `completedAt = now()`.
- Setting `completed = false` MUST clear `completedAt = null`.
- After any toggle, the `streaks` row MUST be recomputed for the user.

---

### 4. Streak

One row per user. Created on first task completion. Updated server-side on every task toggle.

```typescript
export const streaks = pgTable("streaks", {
  id:             uuid("id").primaryKey().defaultRandom(),
  userId:         text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  currentStreak:  integer("current_streak").notNull().default(0),
  longestStreak:  integer("longest_streak").notNull().default(0),
  lastActiveDate: date("last_active_date"),
  updatedAt:      timestamp("updated_at").defaultNow().notNull(),
});
```

**Streak computation** (applied server-side on every task completion):

```
today = current UTC date
if lastActiveDate == today:        → no change (already counted)
if lastActiveDate == yesterday:    → currentStreak += 1, lastActiveDate = today
if lastActiveDate < yesterday:     → currentStreak = 1, lastActiveDate = today
if currentStreak > longestStreak:  → longestStreak = currentStreak
```

---

## State Transitions

### Report Status

```
fetching → analyzing → teaching → planning → complete
                                            ↘ failed
```

The Orchestrator updates the report `status` column after each agent completes successfully.
On unrecoverable failure (after retries), status is set to `failed`.

### Task Completion

```
completed: false → completed: true   (completedAt set to now())
completed: true  → completed: false  (completedAt cleared to null)
```

---

## Validation Rules Summary

| Field | Rule |
|---|---|
| `reports.videoId` | Matches `^[a-zA-Z0-9_-]{11}$` |
| `reports.projectContext` | Non-empty after trim; UI enforces ≥10 chars |
| `reports.estimatedDifficulty` | `beginner \| intermediate \| advanced` or null |
| `reports.status` | `fetching \| analyzing \| teaching \| planning \| complete \| failed` |
| `reportSections.sectionType` | `concept \| highlights \| models \| examples \| actions` |
| `tasks.scope` | `today \| week \| month` |
| `tasks.completedAt` | Set when `completed = true`; null when `completed = false` |

---

## Migration Order

```
drizzle/migrations/
├── 0001_create_reports.sql
├── 0002_create_report_sections.sql
├── 0003_create_tasks.sql
└── 0004_create_streaks.sql
```

RLS policies are applied via Drizzle migration scripts after table creation.
Each new table requires `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY`.

---

## Data Isolation (FR-018)

Every Drizzle query against `reports`, `tasks`, and `streaks` MUST include a
`where(eq(table.userId, session.user.id))` clause. This is the primary enforcement layer.

PostgreSQL RLS policies serve as the secondary enforcement layer:
```sql
-- Example for reports
CREATE POLICY reports_isolation ON reports
  USING (user_id = current_setting('app.current_user_id', true));
```

**Exception**: `reportSections` does not have a direct `userId` column. Access is enforced
by always JOINing to `reports` and filtering by `reports.userId`.

**Public share exception**: When `reports.isShared = true`, `app/share/[id]/page.tsx` may
read the report and its sections without a user session. This route uses a service-role
Drizzle query that bypasses user-id filtering — only permitted for this one route.
