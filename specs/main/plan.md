# Implementation Plan: LearnAgent MVP

**Branch**: `main` | **Date**: 2026-03-27 | **Spec**: `youtube gen master.md`
**Input**: Feature specification from `youtube gen master.md` (authoritative) + `CLAUDE.md`

## Summary

LearnAgent is a full-stack web application that transforms YouTube videos into actionable,
project-specific learning reports via a 4-agent AI pipeline. The user supplies a YouTube URL
and a `project_context` string (what they are currently building). The pipeline produces a
structured report with concept summary, highlights, mental models, and a project-specific
action plan. The MVP ships phases 0–10 sequentially with defined exit conditions per phase.

## Technical Context

**Language/Version**: TypeScript / Node.js 20 LTS
**Primary Dependencies**: Next.js 14 App Router, Tailwind CSS, Supabase JS v2, Anthropic SDK
(`@anthropic-ai/sdk`), Recharts, Resend
**Storage**: Supabase — PostgreSQL with Row Level Security (RLS MUST be enabled on all tables)
**Testing**: Manual end-to-end validation per phase exit condition (no automated test framework
specified in master.md); curl-based API smoke tests defined in CLAUDE.md
**Target Platform**: Web application — Vercel (production), localhost:3000 (development)
**Project Type**: Full-stack web-service (Next.js monorepo — API routes + React UI in one repo)
**Performance Goals**: POST /api/analyze MUST return a complete, contract-valid report in <90s
**Constraints**:
- No internal terminology ("orchestrator", "agent", etc.) in any visible UI text
- `project_context` MUST be passed to Action Agent and ONLY the Action Agent
- All Supabase tables MUST have RLS enabled and policies applied
- Phases MUST be completed sequentially; no phase may be skipped
**Scale/Scope**: MVP single-user tier; 11 build phases (0–10); browser extension deferred to v1.3

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Spec First | `youtube gen master.md` read in full before this plan | ✅ PASS |
| II. Contracts Are Law | All 4 agent contracts verified (Section 2.4 of master.md) | ✅ PASS |
| III. Sequential Phase Execution | 11 phases (0–10) with defined exit conditions | ✅ PASS |
| IV. project_context Isolation | Only Action Agent receives project_context — enforced in Orchestrator | ✅ PASS |
| V. Clean UI Boundary | No internal terms in UI — all agent/pipeline names are backend-only | ✅ PASS |

**GATE RESULT: ALL PRINCIPLES PASS — Phase 0 research may proceed.**

*Post-design re-check*: API contracts and data model validated against master.md Section 2.4 — see
Constitution Check Re-evaluation at bottom of Phase 1.

## Project Structure

### Documentation (this feature)

```text
specs/main/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api-analyze.md
│   ├── api-reports.md
│   ├── api-tasks.md
│   └── api-share.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
youtube-tuto/                    # Next.js monorepo root (App Router)
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── home/page.tsx
│   │   ├── process/[id]/page.tsx
│   │   ├── report/[id]/page.tsx
│   │   ├── library/page.tsx
│   │   ├── progress/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── analyze/route.ts        ← POST: pipeline entry point
│   │   ├── reports/route.ts        ← GET: user report list
│   │   ├── reports/[id]/route.ts   ← GET: single report
│   │   ├── tasks/[id]/route.ts     ← PATCH: toggle task completion
│   │   ├── share/[id]/route.ts     ← GET: public shared report
│   │   └── notifications/route.ts  ← POST: trigger email
│   ├── layout.tsx
│   └── globals.css
├── agents/
│   ├── orchestrator.ts     ← pipeline manager, sole relay
│   ├── fetcher.ts          ← transcript retrieval only
│   ├── analyst.ts          ← structured content analysis
│   ├── teacher.ts          ← plain-language educator
│   └── action.ts           ← project-specific action plan
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── anthropic/
│   │   └── client.ts
│   └── supadata/
│       └── client.ts
├── components/
│   ├── ui/                 ← shared primitives
│   ├── report/             ← report card components
│   ├── library/            ← library list components
│   └── dashboard/          ← progress chart components
├── supabase/
│   └── migrations/         ← SQL migration files
├── .env.local
├── CLAUDE.md
└── youtube gen master.md
```

**Structure Decision**: Next.js monorepo (Option 2 adapted — API routes ARE the backend; no
separate backend directory). All API logic lives in `app/api/`. All agent logic lives in `agents/`.

## Complexity Tracking

> **No constitution violations requiring justification.**

---

## Phase 0: Research Findings

*All findings consolidated in `specs/main/research.md`.*

Summary of decisions:
- Transcript: Supadata.ai primary (`GET /v1/youtube/transcript`), RapidAPI as cold fallback
- Auth: Supabase Auth with Google OAuth + email/password; session via `@supabase/ssr`
- Streaming: Server-Sent Events (SSE) for real-time pipeline progress on processing screen
- AI model: `claude-sonnet-4-6` (pinned per constitution — no upgrades without testing)
- Email: Resend SDK (simpler integration than Supabase Edge Functions for MVP)
- No automated test framework added to MVP — manual phase exit validation per CLAUDE.md

---

## Phase 1: Design & Contracts

*All design artifacts in `specs/main/`. Agent contracts in `specs/main/contracts/`.*

### Constitution Check Re-evaluation (Post-Design)

| Principle | Design Verification |
|---|---|
| II. Contracts Are Law | API contracts match agent output contracts from master.md Section 2.4 |
| IV. project_context Isolation | Orchestrator code MUST NOT forward project_context to fetcher/analyst/teacher routes |
| V. Clean UI Boundary | All API error responses use user-facing language; no agent names in response bodies |

**POST-DESIGN GATE: ALL PRINCIPLES PASS.**
