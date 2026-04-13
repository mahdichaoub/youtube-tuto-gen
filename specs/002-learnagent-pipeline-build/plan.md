# Implementation Plan: LearnAgent Pipeline Build

**Branch**: `002-learnagent-pipeline-build` | **Date**: 2026-04-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-learnagent-pipeline-build/spec.md`

## Summary

Build the full LearnAgent product on top of the existing agentic boilerplate. The boilerplate
provides authentication (Better Auth + Google OAuth), PostgreSQL via Drizzle ORM, shadcn/ui,
and Next.js 14 App Router. This feature adds the multi-agent AI pipeline (Orchestrator →
Fetcher → Analyst → Teacher → Action Agent), six report content tables, server-side SSE
progress streaming, task tracking with streak logic, a searchable library, progress dashboard,
and share/export — transforming the boilerplate into a production-ready learning execution tool.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS (Next.js 14 App Router)
**Primary Dependencies**: Next.js 14, React 19, Drizzle ORM, Better Auth, @anthropic-ai/sdk
  (claude-sonnet-4-6), Recharts, shadcn/ui, Tailwind CSS, Supadata.ai REST API,
  RapidAPI YouTube Transcript (fallback)
**Storage**: PostgreSQL (existing — accessed via Drizzle ORM)
**Testing**: Manual end-to-end validation per phase exit condition (no automated test framework
  added at MVP — deferred to post-MVP per research decision)
**Target Platform**: Web — desktop browser, deployed on Vercel
**Project Type**: Full-stack web service (Next.js App Router, API routes as backend)
**Performance Goals**: Pipeline < 90s end-to-end; share link load < 3s; dashboard < 2s;
  library search < 1s after user stops typing
**Constraints**: Single active generation per user; data isolation enforced at DB query layer;
  no offline support; no browser extension; no native mobile app
**Scale/Scope**: Individual users, up to ~100 reports per user; single-user data tier (no teams)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Spec First | `youtube gen master.md` read in full before any code; this plan derived from spec | ✅ PASS |
| II. Contracts Are Law | All 5 agent contracts defined in contracts/ and data-model.md; violations halt pipeline | ✅ PASS |
| III. Sequential Phase Execution | Phases 0–10 ordered; each has an exit condition; none skipped | ✅ PASS |
| IV. project_context Isolation | `project_context` passed only to Action Agent in `agents/action.ts`; no other agent receives it | ✅ PASS |
| V. Clean UI Boundary | SSE `stage` field MUST NOT be displayed verbatim; UI label map required; internal agent names banned from all UI text | ✅ PASS |

**Tech Stack Constraints (from constitution)**:

| Layer | Required | This Plan |
|---|---|---|
| Framework | Next.js 14 App Router | ✅ Existing boilerplate |
| Styling | Tailwind CSS | ✅ Existing boilerplate |
| Auth | Better Auth + Google OAuth | ✅ Existing boilerplate |
| AI Agents | Anthropic claude-sonnet-4-6 | ✅ Pinned in agents/*.ts |
| Transcript | Supadata.ai primary / RapidAPI fallback | ✅ lib/supadata/client.ts |
| Charts | Recharts | ✅ Added for progress dashboard |
| Deployment | Vercel | ✅ Existing setup |

No constitution violations. Complexity Tracking section not required.

## Project Structure

### Documentation (this feature)

```text
specs/002-learnagent-pipeline-build/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── api-analyze.md
│   ├── api-reports.md
│   ├── api-tasks.md
│   └── api-share.md
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/                    # existing — login, register, forgot-password, reset-password
│   ├── (app)/
│   │   ├── home/                  # NEW — URL form + recent reports
│   │   ├── process/[id]/          # NEW — SSE progress screen
│   │   ├── report/[id]/           # NEW — tabbed report cards
│   │   ├── library/               # NEW — searchable report list
│   │   └── progress/              # NEW — streak + stats dashboard
│   ├── share/[id]/                # NEW — public report (no auth required)
│   └── api/
│       ├── auth/[...all]/         # existing — Better Auth handler
│       ├── analyze/               # NEW — POST pipeline entry point
│       │   └── [id]/stream/       # NEW — GET SSE progress stream
│       ├── reports/               # NEW — GET list + GET [id]
│       │   └── [id]/
│       │       └── share/         # NEW — POST toggle sharing
│       ├── tasks/
│       │   └── [id]/              # NEW — PATCH toggle completion
│       └── streak/                # NEW — GET current streak
├── agents/
│   ├── orchestrator.ts            # NEW — pipeline manager
│   ├── fetcher.ts                 # NEW — transcript retrieval
│   ├── analyst.ts                 # NEW — structured content analysis
│   ├── teacher.ts                 # NEW — plain-language summary
│   └── action.ts                  # NEW — project-specific action plan
├── lib/
│   ├── auth.ts                    # existing — Better Auth config
│   ├── auth-client.ts             # existing — client-side auth
│   ├── db.ts                      # existing — Drizzle connection
│   ├── schema.ts                  # EXTEND — add reports, report_sections, tasks, streaks tables
│   ├── session.ts                 # existing — server-side session helper
│   ├── supadata/
│   │   └── client.ts              # NEW — Supadata + RapidAPI fallback
│   └── anthropic/
│       └── client.ts              # NEW — Anthropic SDK singleton
├── components/
│   ├── ui/                        # existing — shadcn/ui components
│   ├── report/                    # NEW — report card components
│   ├── library/                   # NEW — report list + search
│   └── dashboard/                 # NEW — streak, stats, Recharts chart
└── drizzle/
    └── migrations/                # NEW — LearnAgent table migrations
```

**Structure Decision**: Extended web application layout, building directly onto the existing
Next.js App Router boilerplate. All new routes are under `(app)/` group for authenticated
pages; `share/[id]` is a top-level public route with no auth middleware.
