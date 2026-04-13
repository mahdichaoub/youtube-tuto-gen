# Research: LearnAgent Pipeline Build on Existing Boilerplate

**Phase**: 0 — Outline & Research
**Input**: `youtube gen master.md`, `specs/002-learnagent-pipeline-build/spec.md`,
  `specs/main/research.md` (prior art), existing boilerplate source
**Date**: 2026-04-13

---

## 1. Transcript Retrieval

**Decision**: Supadata.ai as primary; RapidAPI YouTube Transcript as cold fallback.

**Rationale**: Supadata provides a clean REST API (`GET /v1/youtube/transcript?videoId=&lang=en`)
returning structured JSON without a headless browser. RapidAPI covers videos where Supadata
returns 404 or rate-limit errors.

**Alternatives considered**:
- `youtube-transcript` npm — fragile cookie state on serverless environments.
- yt-dlp — requires binary on Vercel; not viable.

**Implementation**: `src/lib/supadata/client.ts` wraps the Supadata REST call. On non-2xx
response, Orchestrator retries once with RapidAPI before returning a transcript_unavailable
error. Both API keys stored in environment variables.

---

## 2. Authentication & Session (Boilerplate-Adapted)

**Decision**: Retain Better Auth as-is. Use `src/lib/session.ts` for server-side session
retrieval in API routes and server components.

**Rationale**: The boilerplate already has Better Auth configured with Google OAuth and
email/password. User IDs are `text` type (Better Auth convention). All LearnAgent tables
reference `user.id` as a `text` foreign key, not UUID.

**Key constraint**: Better Auth IDs are `text`, not `uuid`. The `reports`, `tasks`, and
`streaks` tables use `text` for `userId` to match.

**Alternatives considered**:
- Switching to Supabase Auth — would require rewriting the entire auth layer; unjustified.
- NextAuth.js — unnecessary replacement of functioning auth.

---

## 3. Real-Time Pipeline Progress

**Decision**: Server-Sent Events (SSE) via a Next.js route handler at
`GET /api/analyze/[id]/stream`, streaming `text/event-stream`. Six stage events emitted
(one per pipeline lifecycle state).

**Rationale**: SSE is simpler than WebSockets for unidirectional server→client streaming.
Next.js App Router supports SSE natively via `ReadableStream` in route handlers. The pipeline
runs server-side (via `POST /api/analyze`), and the SSE stream allows clients to re-attach
if they navigate away and return to the processing URL.

**SSE event shape**:
```
data: {"stage":"fetching","status":"running","progress":0}
data: {"stage":"fetching","status":"complete","progress":20}
data: {"stage":"analyzing","status":"running","progress":20}
data: {"stage":"analyzing","status":"complete","progress":40}
data: {"stage":"teaching","status":"running","progress":40}
data: {"stage":"teaching","status":"complete","progress":60}
data: {"stage":"planning","status":"running","progress":60}
data: {"stage":"planning","status":"complete","progress":80}
data: {"stage":"saving","status":"running","progress":80}
data: {"stage":"saving","status":"complete","progress":100}
data: {"type":"done","report_id":"<uuid>"}
```

On failure:
```
data: {"type":"error","message":"<user-facing message — no internal terms>"}
```

**UI label map** (stage → display text — NEVER show raw stage value):
- `fetching` → "Reading the video"
- `analyzing` → "Analyzing the content"
- `teaching` → "Writing your summary"
- `planning` → "Crafting your action plan"
- `saving` → "Saving your report"

**Alternatives considered**:
- WebSockets — bidirectional; overkill for one-way progress.
- Polling `/api/reports/[id]` — adds latency and complicates status field logic.
- Supabase Realtime — not applicable; boilerplate uses Drizzle, not Supabase client.

---

## 4. AI Model & SDK

**Decision**: `claude-sonnet-4-6` via `@anthropic-ai/sdk`. Model ID pinned per constitution.
Non-streaming `messages.create()` calls for all three AI agents (Analyst, Teacher, Action).

**Rationale**: Model is pinned in CLAUDE.md and constitution. Non-streaming is required because
the Orchestrator needs the full response before contract validation and before passing to the
next agent.

**Max tokens**: 4096 per agent call. Sufficient for all output contracts.

**Alternatives considered**:
- claude-opus-4-6 — higher quality, 5× cost; not justified for MVP.
- Streaming responses — breaks contract validation; the Orchestrator needs the full output.

**Implementation**: `src/lib/anthropic/client.ts` exports a singleton `Anthropic` instance.

---

## 5. Data Isolation (Drizzle + PostgreSQL)

**Decision**: Application-layer isolation enforced via mandatory `where userId = currentUserId`
clause in every Drizzle query, backed by PostgreSQL RLS as a safety net.

**Rationale**: Drizzle ORM doesn't natively support row-level session variables the way
Supabase's Postgres client does. The safest pattern with Drizzle is:
1. Every query includes `.where(eq(table.userId, session.user.id))` — app-layer guarantee.
2. PostgreSQL RLS policies on `reports`, `tasks`, `streaks` as a database-layer backstop.

This satisfies FR-018 (data isolation enforced at the data access layer).

**RLS policy approach**: Use a `SET LOCAL app.current_user_id = '<id>'` call at the start of
each DB transaction, referenced in RLS policies via `current_setting('app.current_user_id')`.
For the MVP, app-layer enforcement in Drizzle queries is the primary mechanism; RLS is the
belt-and-suspenders fallback.

---

## 6. Report Status Lifecycle

**Decision**: Six internal states: `fetching | analyzing | teaching | planning | complete | failed`.

**Rationale**: Chosen by founder during `/speckit.clarify` session (2026-04-12). Each state
maps to one pipeline stage. The `status` column in the `reports` table is updated as each
stage completes. The processing screen reads the SSE stream — it does NOT read `status` directly.

**Note on UI**: The `status` field value MUST NEVER be displayed verbatim in any UI text.
It is a storage/system field only.

---

## 7. Sharing Model

**Decision**: Toggleable `isShared` boolean on the `reports` table. When `true`, the report
is accessible at `/share/[id]` without authentication. When toggled to `false`, the route
returns 404 immediately.

**Rationale**: Chosen by founder during clarification session. Simple boolean avoids the
complexity of token generation/invalidation tables at MVP. The report `id` (UUID) is already
sufficiently unguessable as the share identifier.

**Share route**: `app/share/[id]/page.tsx` — public Next.js page, excluded from auth middleware,
SSR with Open Graph meta tags.

---

## 8. Streak Tracking

**Decision**: Dedicated `streaks` table (one row per user). Updated server-side on every task
completion toggle. Fields: `userId`, `currentStreak`, `longestStreak`, `lastActiveDate`.

**Streak computation rule**:
- If `lastActiveDate` = today → no change to streak (already counted this day).
- If `lastActiveDate` = yesterday → `currentStreak += 1`; update `lastActiveDate` to today.
- If `lastActiveDate` < yesterday (or null) → `currentStreak = 1`; update `lastActiveDate`.
- If `currentStreak > longestStreak` → update `longestStreak`.

**Reset rule** (FR-011): If user has not completed any task in 48+ hours, streak resets to 0
on next task completion (covered by the "< yesterday" branch above).

---

## 9. Testing Strategy

**Decision**: Manual end-to-end validation per phase exit condition. No automated test framework
added at MVP.

**Rationale**: Phase exit conditions in CLAUDE.md and quickstart.md are concrete and testable
via curl and manual browser flows. Automated tests (Jest/Vitest/Playwright) deferred to
post-MVP to avoid extending the build timeline.

---

## 10. Recharts for Progress Dashboard

**Decision**: Recharts `BarChart` or `AreaChart` for the 30-day activity chart. Already listed
as a pinned dependency in the constitution.

**Data shape for chart**: Array of `{ date: "YYYY-MM-DD", tasksCompleted: number }` for the
past 30 days. Derived from the `tasks` table by grouping `completed_at` by date.

**Alternatives considered**: None — Recharts is pinned in the constitution; no substitution
allowed without founder approval.
