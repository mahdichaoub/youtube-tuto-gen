# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**LearnAgent** — an execution layer for self-directed learning. It transforms YouTube videos into actionable, project-specific course modules via a multi-agent AI pipeline. The key differentiator is `project_context`: a user-supplied string about what they are currently building, which anchors every generated action plan to real work.

The full spec lives in `youtube gen master.md`. Read it before writing any code.

---

## Current Status (updated 2026-04-13)

**Active feature branch**: `002-learnagent-pipeline-build`
**Spec status**: Complete and clarified — `specs/002-learnagent-pipeline-build/spec.md`
**Planning status**: Complete — all Phase 0 and Phase 1 artifacts generated:
- `specs/002-learnagent-pipeline-build/research.md` ✅
- `specs/002-learnagent-pipeline-build/data-model.md` ✅
- `specs/002-learnagent-pipeline-build/contracts/` ✅ (4 files)
- `specs/002-learnagent-pipeline-build/quickstart.md` ✅

**Next step**: Run `/speckit.tasks` to generate the implementation task list.

**Build phase**: Pre-implementation (Spec → Plan → Tasks → Build)

---

## Session Start Protocol

Before every session:
1. Read `youtube gen master.md` completely.
2. Read `specs/002-learnagent-pipeline-build/spec.md` to understand what is being built.
3. Read `specs/002-learnagent-pipeline-build/plan.md` for the current implementation design.
4. State what you are about to build and wait for confirmation.
5. Never skip a phase — each has a defined exit condition that must be met.

---

## Commands

```bash
# Development
npm run dev

# Database (Docker + Drizzle)
docker compose up -d           # start local PostgreSQL
npm run db:push                # push Drizzle schema to DB
npm run db:generate            # generate migrations
npm run db:migrate             # run migrations
npm run db:studio              # open Drizzle Studio at http://localhost:4983

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

Create `.env.local` before Phase 3. Add to `.gitignore` before committing.

```
# Database
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/learnagent

# Better Auth (already configured in boilerplate)
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI Pipeline
ANTHROPIC_API_KEY=

# Transcript
SUPADATA_API_KEY=
RAPIDAPI_KEY=          # fallback — optional for local dev

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router + TypeScript 5.x |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Better Auth (Google OAuth + email/password) |
| Database | PostgreSQL via Drizzle ORM |
| AI Agents | Anthropic Claude API (`claude-sonnet-4-6`) — model ID pinned |
| Transcript | Supadata.ai (primary) / RapidAPI YouTube Transcript (fallback) |
| Charts | Recharts |
| Deployment | Vercel |

**Note**: This project is built on top of an agentic coding boilerplate. The auth, database
connection, and UI components are provided by the boilerplate. Do not rebuild them.

---

## Architecture

### Multi-Agent Pipeline

```
User Input (YouTube URL + project_context)
           ↓
    ORCHESTRATOR
    ├─→ FETCHER       → transcript JSON
    ├─→ ANALYST       → structured analysis JSON
    ├─→ TEACHER       → plain markdown summary
    └─→ ACTION AGENT  ← (teacher MD + analyst JSON + project_context)
                      → tailored action plan markdown
           ↓
    Save to PostgreSQL (Drizzle) → return report_id
    SSE stream emits 6 stage events to processing screen
```

Agents are stateless and contract-driven. The Orchestrator is the sole relay — it never summarizes content itself.

### The `project_context` Rule (Sacred)

`project_context` is passed to the **Action Agent and only the Action Agent**. No other agent receives it. Every task the Action Agent produces must be impossible to write without knowing both the video content AND the user's project context. Generic tasks are contract violations.

### Data Contracts (Law)

Every agent's output must match its contract before the Orchestrator proceeds. Contracts are defined in `youtube gen master.md` Section 2.4 and in `specs/002-learnagent-pipeline-build/contracts/`. Verify against the contract before marking any agent complete.

**Fetcher output:** `{ video_id, video_url, title, transcript_length, language, is_partial, transcript }`

**Analyst output:** `{ video_id, core_concept (one sentence), key_highlights (5–7), mental_models, examples_used, warnings_and_mistakes, key_terms, estimated_difficulty, topic_category }`

**Teacher output:** Markdown with required sections `## 🧠 What This Is Really About` and `## 💡 The Key Things You Need to Know`

**Action Agent output:** Markdown with all sections required — Do Today (3 items), This Week (3 milestones), 30-Day Challenge (1, video+project specific), Resources, How to Know It's Working (3 metrics)

### Database Schema (Drizzle — add to `src/lib/schema.ts`)

```
reports        — id (uuid), userId (text→user.id), videoId, videoUrl, title,
                 topicCategory, estimatedDifficulty, projectContext,
                 status (fetching|analyzing|teaching|planning|complete|failed),
                 isShared (boolean, default false), createdAt, updatedAt

report_sections — id (uuid), reportId (uuid→reports.id),
                  sectionType (concept|highlights|models|examples|actions),
                  contentJson (jsonb), createdAt

tasks          — id (uuid), reportId (uuid→reports.id), userId (text→user.id),
                 label, scope (today|week|month),
                 completed (boolean), completedAt, createdAt

streaks        — id (uuid), userId (text→user.id) UNIQUE,
                 currentStreak, longestStreak, lastActiveDate, updatedAt
```

### SSE Progress Stream (6 stages — internal values only)

| Stage (internal) | UI display text |
|---|---|
| `fetching` | Reading the video |
| `analyzing` | Analyzing the content |
| `teaching` | Writing your summary |
| `planning` | Crafting your action plan |
| `saving` | Saving your report |
| `complete` / `failed` | (navigation / error state) |

**Never display the raw stage value in UI text.**

---

## File Structure

```
src/
├── app/
│   ├── (auth)/             ← existing boilerplate: login, register, forgot/reset password
│   ├── (app)/
│   │   ├── home/           ← NEW: URL form + recent reports
│   │   ├── process/[id]/   ← NEW: SSE progress screen
│   │   ├── report/[id]/    ← NEW: tabbed report cards
│   │   ├── library/        ← NEW: searchable report list
│   │   └── progress/       ← NEW: streak + stats dashboard
│   ├── share/[id]/         ← NEW: public report (no auth)
│   └── api/
│       ├── auth/[...all]/  ← existing: Better Auth handler
│       ├── analyze/        ← NEW: POST pipeline + GET SSE stream
│       ├── reports/        ← NEW: GET list, GET [id], POST [id]/share
│       ├── tasks/[id]/     ← NEW: PATCH toggle completion
│       └── streak/         ← NEW: GET current streak
├── agents/
│   ├── orchestrator.ts     ← NEW
│   ├── fetcher.ts          ← NEW
│   ├── analyst.ts          ← NEW
│   ├── teacher.ts          ← NEW
│   └── action.ts           ← NEW
├── lib/
│   ├── auth.ts             ← existing
│   ├── auth-client.ts      ← existing
│   ├── db.ts               ← existing
│   ├── schema.ts           ← EXTEND: add 4 new tables
│   ├── session.ts          ← existing
│   ├── supadata/client.ts  ← NEW
│   └── anthropic/client.ts ← NEW
└── components/
    ├── ui/                 ← existing shadcn/ui
    ├── report/             ← NEW
    ├── library/            ← NEW
    └── dashboard/          ← NEW
```

---

## Build Phases (Sequential — Never Skip)

| Phase | Name | Exit Condition |
|---|---|---|
| 0 | Spec & Setup | Spec clarified; plan complete; tasks generated |
| 1 | Database Schema | All 4 tables exist; RLS enabled; test insert/select succeeds |
| 2 | Authentication | Already complete (boilerplate); verify session works |
| 3 | Agent Pipeline | POST with real URL + project_context returns complete report in <90s |
| 4 | Home Screen | Form submits both fields; recent reports visible; navigation correct |
| 5 | Processing Screen | 5 user-friendly progress steps animate; auto-navigation on completion |
| 6 | Report Cards | All 5 tabs render; action plan tab prominent; task completion persists; streak updates live |
| 7 | Share + Export | Share toggle works; public link accessible when on, 404 when off; Markdown export valid |
| 8 | Library | Searchable; most-recent-first; empty state correct |
| 9 | Progress Dashboard | All 4 metrics accurate; chart renders with real data |
| 10 | Polish | End-to-end pass; zero internal terms in UI; production deploy verified |

---

## Non-Negotiable Rules

1. **Spec First** — Never generate a file or write code without checking `youtube gen master.md` first. If what you're about to build isn't in the spec, ask before building it.
2. **Contracts Are Law** — Verify every agent's output against its data contract before proceeding. See `specs/002-learnagent-pipeline-build/contracts/`.
3. **Never Skip a Phase** — Meet each phase's exit condition before moving to the next.
4. **No Internal Terminology in UI** — Stage names (`fetching`, `analyzing`, `teaching`, `planning`), agent names, and pipeline vocabulary must never appear in any visible UI text, error message, button label, placeholder, or loading state.
5. **Failures Are Data** — When an agent fails, identify which contract field was violated, fix the agent, retry.
6. **One Generation at a Time** — Only one active pipeline per user. Block new submissions while one is in `fetching | analyzing | teaching | planning` status.
7. **Data Isolation** — Every Drizzle query against `reports`, `tasks`, `streaks` MUST include `.where(eq(table.userId, session.user.id))`. No exceptions except the public share route.

---

## File Rules

- `youtube gen master.md` — Read-only. Never modify during a build session.
- `CLAUDE.md` — Update when stack or status changes. Keep current.
- `specs/002-learnagent-pipeline-build/spec.md` — Update only via `/speckit.clarify`.
- `agents/*.ts` — Modify only to fix contract violations. Verify output after every change.
- `src/lib/schema.ts` — Extend with new tables; never remove existing Better Auth tables.
