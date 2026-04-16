# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**LearnAgent** — submit a YouTube URL + what you're building → get a project-specific action plan in under 90 seconds.

The core differentiator is `project_context`: a user-supplied string about what they are currently building, which anchors every generated action plan to real work. The full spec lives in `youtube gen master.md`.

---

## Current Status (updated 2026-04-13)

**Active feature branch**: `002-learnagent-pipeline-build`
**Build phase**: Implementation — tasks.md generated (T001–T045, 45 tasks)

**Spec artifacts** (all complete):
- `specs/002-learnagent-pipeline-build/spec.md` ✅
- `specs/002-learnagent-pipeline-build/plan.md` ✅
- `specs/002-learnagent-pipeline-build/research.md` ✅
- `specs/002-learnagent-pipeline-build/data-model.md` ✅
- `specs/002-learnagent-pipeline-build/contracts/` ✅ (4 files)
- `specs/002-learnagent-pipeline-build/quickstart.md` ✅
- `specs/002-learnagent-pipeline-build/tasks.md` ✅

**Next step**: Run `/speckit.implement` or start implementing T001.

---

## Session Start Protocol

Before every session:
1. Read `specs/002-learnagent-pipeline-build/spec.md`.
2. Read `specs/002-learnagent-pipeline-build/tasks.md` and identify which tasks are still unchecked.
3. State which task you are picking up and wait for confirmation.
4. Never skip a phase — each has a defined exit condition that must be met.

---

## Commands

The project uses **pnpm** (not npm). Always use `pnpm` commands.

```bash
# Development
pnpm dev

# Type checking and linting
pnpm typecheck
pnpm lint
pnpm check          # runs lint + typecheck together

# Database (Docker + Drizzle)
docker compose up -d           # start local PostgreSQL
pnpm db:push                   # push Drizzle schema to DB (fast, no migration files)
pnpm db:generate               # generate migration SQL files
pnpm db:migrate                # run pending migrations
pnpm db:studio                 # open Drizzle Studio at http://localhost:4983
pnpm db:reset                  # drop all + push fresh schema

# Deploy
vercel --prod

# Test transcript API
curl "https://api.supadata.ai/v1/youtube/transcript?videoId=VIDEO_ID&lang=en" \
  -H "x-api-key: $SUPADATA_API_KEY"

# Test full pipeline locally
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -H "Cookie: <better-auth-session-cookie>" \
  -d '{"url":"https://youtube.com/watch?v=VIDEO_ID","project_context":"Building a SaaS app"}'

# Test SSE stream
curl -N "http://localhost:3000/api/analyze/<report_id>/stream" \
  -H "Cookie: <better-auth-session-cookie>"
```

---

## Environment Variables

Create `.env.local` (already in `.gitignore`). Copy `env.example` as your base.

```
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/learnagent
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ANTHROPIC_API_KEY=
SUPADATA_API_KEY=
RAPIDAPI_KEY=          # fallback — optional for local dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router + TypeScript 5.x |
| Package manager | pnpm |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Better Auth (Google OAuth + email/password) |
| Database | PostgreSQL via Drizzle ORM (`postgres` driver) |
| AI agents | `@anthropic-ai/sdk` direct — `messages.create()` non-streaming, model pinned to `claude-sonnet-4-6` |
| Transcript | Supadata.ai REST API (primary) / RapidAPI YouTube Transcript (fallback) |
| Charts | Recharts |
| Deployment | Vercel |

**Boilerplate note**: Auth (`src/lib/auth.ts`, `auth-client.ts`), DB connection (`src/lib/db.ts`), and shadcn components (`src/components/ui/`) are provided and must not be rebuilt. The boilerplate includes unused chat and dashboard routes (`src/app/chat/`, `src/app/dashboard/`) — leave them as-is for now.

**AI SDK note**: LearnAgent uses a **multi-provider model layer** (`src/lib/models/call.ts`) built on the Vercel AI SDK (`generateText` from `"ai"`) to support Anthropic, Moonshot/Kimi, OpenRouter, and other providers uniformly. This is an approved deviation from the original spec (which specified `@anthropic-ai/sdk` direct). The default model is `claude-sonnet-4-6`. Do not replace this layer with `@anthropic-ai/sdk` direct calls.

---

## Architecture

### Multi-Agent Pipeline

```
User Input (YouTube URL + project_context)
           ↓
    ORCHESTRATOR  (src/agents/orchestrator.ts)
    ├─→ FETCHER     → transcript JSON              (no AI call — Supadata REST)
    ├─→ ANALYST     → structured analysis JSON     (multi-provider model layer)
    ├─→ RESEARCHER  → concept articles + docs      (multi-provider, non-fatal)
    ├─→ TEACHER     → plain markdown summary       (multi-provider model layer)
    └─→ ACTION      ← teacher MD + analyst JSON + project_context
                    → tailored action plan         (multi-provider model layer)
           ↓
    Save to PostgreSQL (Drizzle) → return report_id
    SSE events emitted via pipeline-emitter → processing screen
```

**7-state pipeline lifecycle** (approved extension from original 6-state spec):
`fetching → analyzing → researching → teaching → planning → saving → complete | failed | partial`

Agents are stateless and contract-driven. The Orchestrator is the sole relay; it never summarizes content itself.

### The `project_context` Rule (Sacred)

`project_context` is passed to the **Action Agent only** (`src/agents/action.ts`). No other agent receives it. Every action plan item must be impossible to write without knowing both the specific video content AND the user's project. Generic tasks are contract violations.

### Data Contracts (Law)

Every agent's output must match its contract before the Orchestrator proceeds. Contracts live in `specs/002-learnagent-pipeline-build/contracts/`.

| Agent | Output contract |
|---|---|
| Fetcher | `{ video_id, video_url, title, transcript_length, language, is_partial, transcript }` |
| Analyst | `{ video_id, core_concept, key_highlights[5–7], mental_models, examples_used, warnings_and_mistakes, key_terms, estimated_difficulty, topic_category }` |
| Teacher | Markdown with `## 🧠 What This Is Really About` and `## 💡 The Key Things You Need to Know` |
| Action | `{ markdown, today: string[3], week: string[3], challenge: string, resources: string[], metrics: string[3] }` |

### Database Schema

All new tables are added to `src/lib/schema.ts`. The existing Better Auth tables (`user`, `session`, `account`, `verification`) must not be modified. Better Auth user IDs are `text`, not `uuid` — all `userId` foreign keys in new tables must be `text`.

```
reports         — id (uuid), userId (text→user.id), videoId, videoUrl, title,
                  topicCategory, estimatedDifficulty, projectContext,
                  status (fetching|analyzing|teaching|planning|complete|failed),
                  isShared (boolean), createdAt, updatedAt

report_sections — id (uuid), reportId (uuid→reports.id), sectionType
                  (concept|highlights|models|examples|actions), contentJson (jsonb), createdAt

tasks           — id (uuid), reportId (uuid→reports.id), userId (text→user.id),
                  label, scope (today|week|month), completed (boolean),
                  completedAt (nullable), createdAt

streaks         — id (uuid), userId (text→user.id, UNIQUE), currentStreak,
                  longestStreak, lastActiveDate (date), updatedAt
```

### SSE Progress Events

The pipeline emits events via `src/lib/pipeline-emitter.ts` (module-level `Map<reportId, EventEmitter>`). The SSE stream route at `GET /api/analyze/[id]/stream` subscribes to this emitter.

| Stage value (internal — never shown in UI) | UI display text |
|---|---|
| `fetching` | Reading the video |
| `analyzing` | Analyzing the content |
| `researching` | Researching the topic |
| `teaching` | Writing your summary |
| `planning` | Crafting your action plan |
| `saving` | Saving your report |

The UI label map is the single source of truth. Raw stage values must never appear in any rendered text.

### Session Helpers

Use `src/lib/session.ts` in API routes and server components:
- `requireAuth()` — throws redirect to `/` if no session; returns session object
- `getOptionalSession()` — returns session or null

**Note**: `protectedRoutes` in `session.ts` currently lists boilerplate routes (`/chat`, `/dashboard`). Update it to include LearnAgent routes (`/home`, `/report`, `/library`, `/progress`) when implementing those pages.

### Data Isolation Rule

Every Drizzle query against `reports`, `tasks`, `streaks` MUST include `.where(eq(table.userId, session.user.id))`. The only permitted bypass is `src/app/share/[id]/page.tsx` for publicly shared reports (`isShared = true`).

---

## File Structure (what to build)

```
src/
├── app/
│   ├── (auth)/               ← existing boilerplate (login, register, password flows)
│   ├── (app)/
│   │   ├── home/             ← NEW: URL form + recent reports
│   │   ├── process/[id]/     ← NEW: SSE progress screen
│   │   ├── report/[id]/      ← NEW: tabbed report cards
│   │   ├── library/          ← NEW: searchable report list
│   │   └── progress/         ← NEW: streak + stats dashboard
│   ├── share/[id]/           ← NEW: public report (no auth)
│   ├── chat/                 ← existing boilerplate (leave as-is)
│   ├── dashboard/            ← existing boilerplate (leave as-is)
│   └── api/
│       ├── auth/[...all]/    ← existing: Better Auth handler
│       ├── analyze/          ← NEW: POST pipeline entry + GET SSE stream
│       ├── reports/          ← NEW: GET list, GET [id], POST [id]/share
│       ├── tasks/[id]/       ← NEW: PATCH toggle completion
│       └── streak/           ← NEW: GET current streak
├── agents/
│   ├── orchestrator.ts       ← NEW
│   ├── fetcher.ts            ← NEW
│   ├── analyst.ts            ← NEW
│   ├── teacher.ts            ← NEW
│   └── action.ts             ← NEW
├── lib/
│   ├── auth.ts               ← existing
│   ├── auth-client.ts        ← existing
│   ├── db.ts                 ← existing (exports `db` Drizzle instance)
│   ├── schema.ts             ← EXTEND: add 4 new tables
│   ├── session.ts            ← existing (requireAuth / getOptionalSession)
│   ├── validate-url.ts       ← NEW
│   ├── pipeline-emitter.ts   ← NEW
│   ├── sse-labels.ts         ← NEW
│   ├── anthropic/client.ts   ← NEW: Anthropic SDK singleton
│   └── supadata/client.ts    ← NEW: Supadata + RapidAPI fallback
├── contexts/
│   └── StreakContext.tsx      ← NEW
└── components/
    ├── ui/                   ← existing shadcn/ui
    ├── report/               ← NEW (ConceptTab, HighlightsTab, ModelsTab, ExamplesTab, ActionPlanTab)
    ├── library/              ← NEW (ReportCard)
    └── dashboard/            ← NEW (StatsCards, ActivityChart)
```

---

## Build Phases (Sequential — Never Skip)

| Phase | Tasks | Exit Condition |
|---|---|---|
| 1 — Setup | T001–T004 | Packages installed; env.example updated; SDK clients created |
| 2 — Foundational | T005–T011 | All 4 DB tables exist in schema; URL validator + pipeline emitter done; `pnpm db:push` succeeds |
| 3 — US1: Pipeline + UI | T012–T027 | POST real URL → SSE stream → complete 5-section report in <90s with project-specific action plan |
| 4 — US2: Tasks + Streak | T028–T032 | Task completion persists across reload; streak counter live in header |
| 5 — US3: Share + Export | T033–T035 | Share link works for unauthenticated visitors; 404 when disabled; Markdown copy valid |
| 6 — US4: Library | T036–T038 | Searchable list renders; empty state correct |
| 7 — US5: Dashboard | T039–T041 | All 4 metrics show real data; chart renders |
| 8 — Polish | T042–T045 | Zero internal terms in UI; end-to-end quickstart.md pass complete |

**Stop and validate after Phase 3.** If the action plan is specific and useful → continue. If generic → fix prompts before building anything else.

---

## Non-Negotiable Rules

1. **Spec First** — Never write a file that isn't in the spec. If unclear, ask before building.
2. **Contracts Are Law** — Verify every agent's output against its contract before proceeding. Violations halt the pipeline.
3. **Never Skip a Phase** — Meet each phase's exit condition before moving to the next.
4. **No Internal Terminology in UI** — Stage names (`fetching`, `analyzing`, etc.), agent names, and pipeline vocabulary must never appear in any visible UI text, error message, button label, or placeholder.
5. **One Generation at a Time** — Block new submissions while any report is in `fetching | analyzing | teaching | planning` status. Return 409 from `POST /api/analyze`.
6. **Data Isolation** — Every Drizzle query against `reports`, `tasks`, `streaks` MUST include `.where(eq(table.userId, session.user.id))`. Exception: `share/[id]` route only.
7. **Failures Are Data** — When an agent fails, identify which contract field was violated, fix the agent, retry.

---

## File Rules

- `youtube gen master.md` — Read-only. Never modify.
- `CLAUDE.md` — Update when stack or status changes.
- `specs/002-learnagent-pipeline-build/spec.md` — Update only via `/speckit.clarify`.
- `src/lib/schema.ts` — Extend only. Never remove existing Better Auth tables.
- `agents/*.ts` — Modify only to fix contract violations. Verify output after every change.
