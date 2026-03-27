# Research: LearnAgent MVP

**Phase**: 0 — Outline & Research
**Input**: `youtube gen master.md`, `CLAUDE.md`
**Date**: 2026-03-27

---

## 1. Transcript Retrieval

**Decision**: Supadata.ai as primary; RapidAPI YouTube Transcript as cold fallback.

**Rationale**: Supadata provides a clean REST API (`GET /v1/youtube/transcript?videoId=&lang=en`)
with structured JSON output. It returns cleaned text without requiring a headless browser.
RapidAPI fallback covers videos where Supadata returns 404 or rate-limit errors.

**Alternatives considered**:
- `youtube-transcript` npm package — requires Node runtime with specific YouTube cookie state;
  fragile on server environments.
- yt-dlp — requires binary installation on Vercel; not viable for serverless.

**Implementation**: `lib/supadata/client.ts` wraps the Supadata API. On non-2xx response, the
Orchestrator retries once with RapidAPI before returning `{ error: "transcript_unavailable" }`.

---

## 2. Authentication

**Decision**: Supabase Auth with Google OAuth + email/password. Session managed via
`@supabase/ssr` (server-side cookie-based sessions for Next.js App Router).

**Rationale**: Supabase Auth is already the database provider; using it for auth avoids a
second auth vendor. `@supabase/ssr` is the recommended package for App Router (replaces deprecated
`@supabase/auth-helpers-nextjs`). Google OAuth is required per master.md Section 2.5.

**Alternatives considered**:
- NextAuth.js — adds complexity without benefit since Supabase Auth already handles OAuth.
- Clerk — paid tier required for Google OAuth; unnecessary cost at MVP.

**Implementation**: Two Supabase clients required:
- `lib/supabase/client.ts` — browser client (uses `createBrowserClient`)
- `lib/supabase/server.ts` — server client (uses `createServerClient` with cookie store)

---

## 3. Real-Time Pipeline Progress

**Decision**: Server-Sent Events (SSE) via a Next.js route handler streaming `text/event-stream`.

**Rationale**: The processing screen (Phase 5) must show real-time agent progress. SSE is
simpler than WebSockets for unidirectional server→client streaming, and Next.js App Router
supports SSE natively via `ReadableStream` in route handlers. No additional infrastructure needed.

**Alternatives considered**:
- WebSockets — bidirectional; unnecessary complexity for one-way progress updates.
- Polling `/api/reports/[id]` — introduces latency and status field management overhead.
- Supabase Realtime — adds a channel subscription; viable but SSE is simpler for this use case.

**Implementation**: `POST /api/analyze` initiates pipeline and immediately returns `{ report_id }`.
A separate `GET /api/analyze/[id]/stream` route streams SSE events:
```
data: {"agent":"fetcher","status":"complete","progress":25}
data: {"agent":"analyst","status":"complete","progress":50}
data: {"agent":"teacher","status":"complete","progress":75}
data: {"agent":"action","status":"complete","progress":100}
data: {"type":"done","report_id":"<uuid>"}
```
The processing screen subscribes to this stream and navigates to `/report/[id]` on `done`.

---

## 4. AI Model & SDK

**Decision**: `claude-sonnet-4-6` via `@anthropic-ai/sdk`. Model ID pinned — no upgrades
without explicit testing per constitution.

**Rationale**: `claude-sonnet-4-6` is the current production model pinned in CLAUDE.md and
master.md. The Anthropic SDK provides streaming and non-streaming message creation. All three
AI agents (Analyst, Teacher, Action) use non-streaming calls since the Orchestrator needs the
full response before passing to the next agent.

**Alternatives considered**:
- `claude-opus-4-6` — higher quality but 5× cost; not justified for MVP pipeline throughput.
- Streaming responses — would complicate contract validation; non-streaming is safer for
  enforcing output contracts.

**Implementation**: `lib/anthropic/client.ts` exports a singleton `Anthropic` instance.
Each agent in `agents/*.ts` calls `client.messages.create(...)` with its system prompt and
structured input. Max tokens set to 4096 per agent call.

---

## 5. Email Notifications

**Decision**: Resend SDK (`resend` npm package).

**Rationale**: Resend provides a simple REST API with an official Node SDK. Integration is a
single `resend.emails.send(...)` call. No Edge Function infrastructure required for MVP.
Supabase Edge Functions remain an option for v2 if cron scheduling is needed.

**Alternatives considered**:
- Supabase Edge Functions — requires Deno runtime; adds deployment complexity at MVP stage.
- SendGrid — older API with more complex setup; Resend is developer-first.
- Nodemailer — requires SMTP credentials; unnecessary for a REST-first approach.

**Implementation**: `app/api/notifications/route.ts` uses Resend to send weekly summary and
streak reminder emails. Triggered manually for MVP; cron scheduling deferred to v2.

---

## 6. Testing Strategy

**Decision**: Manual end-to-end validation per phase exit condition. No automated test framework
added to MVP.

**Rationale**: master.md defines specific exit conditions per phase (e.g., "POST with real URL
returns complete report in <90s"). These are validated manually using curl commands defined in
CLAUDE.md. Adding Jest/Vitest would extend Phase 0 timeline without corresponding spec coverage.

**Alternatives considered**:
- Jest + supertest — viable for API route testing; deferred to post-MVP.
- Playwright — valuable for E2E UI testing; deferred to polish phase.

**NEEDS CLARIFICATION resolved**: None — all technical unknowns resolved via master.md sections
2.2–2.10.

---

## 7. Share & Export

**Decision**: Next.js dynamic OG meta tags for share links; Clipboard API for Markdown export.

**Rationale**: Share links (`/share/[id]`) must open without login (master.md Phase 7 exit
condition). Next.js `generateMetadata` in the share route generates OG tags. Markdown export
uses `navigator.clipboard.writeText()` with the action plan content.

**Implementation**:
- `app/share/[id]/page.tsx` — public route (no auth middleware), SSR with OG tags
- `app/api/share/[id]/route.ts` — returns report data without authentication check

---

## 8. Streak Tracking

**Decision**: Dedicated `streaks` table in Supabase (per master.md Section 2.4 Final Report
Contract). Updated server-side when a task is marked complete.

**Fields**: `id, user_id, current_streak, longest_streak, last_active_date`

**Rationale**: Streak computation requires knowing the last active date. Storing it in a dedicated
table avoids recomputing from tasks history on every dashboard load.
