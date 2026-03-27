# Data Model: LearnAgent MVP

**Phase**: 1 — Design & Contracts
**Source**: `youtube gen master.md` Section 2.4 (Final Report Contract) + research decisions
**Date**: 2026-03-27

---

## Entities

### 1. User (managed by Supabase Auth)

Supabase Auth manages the `auth.users` table. A public `profiles` view or trigger may be added
in a migration if user metadata (display name, avatar) is needed in the app layer.

**Key fields (from `auth.users`)**: `id (uuid)`, `email`, `created_at`

---

### 2. Report

The primary aggregate. One report per YouTube URL + user submission.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | |
| `user_id` | uuid | FK → auth.users(id), NOT NULL | RLS filter |
| `video_id` | text | NOT NULL | 11-char YouTube video ID |
| `video_url` | text | NOT NULL | Full YouTube URL |
| `title` | text | | Video title from Fetcher |
| `topic_category` | text | | From Analyst output |
| `estimated_difficulty` | text | CHECK IN ('beginner','intermediate','advanced') | From Analyst output |
| `project_context` | text | NOT NULL | User-supplied; stored for display on Card 5 |
| `status` | text | CHECK IN ('pending','processing','complete','failed') | Pipeline status |
| `created_at` | timestamptz | NOT NULL, default now() | |

**RLS Policies**:
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id` (status updates from server role)
- DELETE: `auth.uid() = user_id`

---

### 3. ReportSection

Stores the structured content of each section of a report. Separate rows per section type
allow independent rendering of each report card.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `report_id` | uuid | FK → reports(id) ON DELETE CASCADE | |
| `section_type` | text | CHECK IN ('concept','highlights','models','examples','actions') | Maps to report cards |
| `content_json` | jsonb | NOT NULL | Structured content per section type |
| `created_at` | timestamptz | NOT NULL, default now() | |

**`content_json` schema per section type**:

- `concept`: `{ "core_concept": "string", "explanation": "string" }`
- `highlights`: `{ "items": ["string", ...] }` (5–7 items)
- `models`: `{ "items": [{ "name": "string", "description": "string" }] }`
- `examples`: `{ "items": ["string", ...] }`
- `actions`: Full Action Agent markdown output stored as `{ "markdown": "string" }` +
  parsed task items `{ "today": ["string"], "week": ["string"], "challenge": "string" }`

**RLS Policies**: Inherit via JOIN — SELECT allowed if `report_id` belongs to `auth.uid()`.
Use a policy: `EXISTS (SELECT 1 FROM reports WHERE reports.id = report_id AND reports.user_id = auth.uid())`

---

### 4. Task

Individual actionable items extracted from the Action Agent output. Supports task completion
tracking and streak calculation.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `report_id` | uuid | FK → reports(id) ON DELETE CASCADE | |
| `user_id` | uuid | FK → auth.users(id) | Denormalized for RLS performance |
| `label` | text | NOT NULL | Task text (max 500 chars) |
| `scope` | text | CHECK IN ('today','week','month') | Maps to Do Today / This Week / 30-Day |
| `completed` | boolean | NOT NULL, default false | |
| `completed_at` | timestamptz | | Set when completed = true |
| `created_at` | timestamptz | NOT NULL, default now() | |

**RLS Policies**:
- SELECT/UPDATE: `auth.uid() = user_id`

---

### 5. Streak

One row per user. Updated server-side when any task is marked complete.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `user_id` | uuid | UNIQUE, FK → auth.users(id) | One row per user |
| `current_streak` | integer | NOT NULL, default 0 | Days in current active streak |
| `longest_streak` | integer | NOT NULL, default 0 | Historical max streak |
| `last_active_date` | date | | Last date a task was completed |

**RLS Policies**:
- SELECT/UPDATE: `auth.uid() = user_id`

---

## State Transitions

### Report Status

```
pending → processing → complete
                    ↘ failed
```

- `pending`: Record inserted, pipeline not yet started.
- `processing`: Orchestrator is running agents.
- `complete`: All agents returned valid contracts; sections and tasks saved.
- `failed`: An agent failed after retries; error stored in report section with type `error`.

### Task Completion

```
completed = false → completed = true
```

Toggle only. Setting `completed = true` MUST also set `completed_at = now()`.
Setting `completed = false` MUST clear `completed_at = null`.
After any task completion toggle, `streaks` row MUST be recomputed for the user.

---

## Validation Rules

- `video_id`: MUST match regex `^[a-zA-Z0-9_-]{11}$`
- `project_context`: MUST be non-empty string (trimmed); UI enforces min 10 chars
- `estimated_difficulty`: MUST be one of `beginner | intermediate | advanced`
- `status`: MUST be one of `pending | processing | complete | failed`
- `scope`: MUST be one of `today | week | month`
- `section_type`: MUST be one of `concept | highlights | models | examples | actions`
- RLS MUST be enabled on ALL tables before any data is inserted

---

## Migrations Order

1. `001_create_reports.sql`
2. `002_create_report_sections.sql`
3. `003_create_tasks.sql`
4. `004_create_streaks.sql`
5. `005_rls_policies.sql`
