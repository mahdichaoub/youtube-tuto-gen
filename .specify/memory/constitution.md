<!--
SYNC IMPACT REPORT
==================
Version change: (unversioned template) → 1.0.0
Modified principles: N/A (initial ratification from blank template)
Added sections: Core Principles (I–V), Tech Stack & Architecture, Development Workflow, Governance
Removed sections: N/A
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gate already present; aligns with principles
  ✅ .specify/templates/spec-template.md — User story + requirements sections align with Spec First principle
  ✅ .specify/templates/tasks-template.md — Phase-gated task structure aligns with Sequential Phase Execution principle
  ✅ .specify/templates/constitution-template.md — Source template; no changes needed
Follow-up TODOs:
  - TODO(RATIFICATION_DATE): Using 2026-03-27 (initial fill date). Update if original project inception date is known.
-->

# LearnAgent Constitution

## Core Principles

### I. Spec First (NON-NEGOTIABLE)

No file MUST be generated and no code MUST be written without first consulting `youtube gen master.md`.
If a proposed change is not covered by the spec, the builder MUST stop and ask the founder before
proceeding. This rule supersedes time pressure, convenience, or apparent obviousness.

**Rationale**: The spec is the authoritative source of truth. Deviating from it without review
introduces undocumented behavior, which breaks the entire contract-driven pipeline.

### II. Contracts Are Law (NON-NEGOTIABLE)

Every agent's output MUST be validated against its defined data contract before the Orchestrator
passes data downstream. A contract violation MUST halt the pipeline. The violating agent MUST be
identified, fixed, and retried. Results MUST be documented in `SPEC.md`.

Contract definitions (canonical):
- **Fetcher**: `{ video_id, video_url, title, transcript_length, language, is_partial, transcript }`
- **Analyst**: `{ video_id, core_concept, key_highlights (5–7), mental_models, examples_used,`
  `warnings_and_mistakes, key_terms, estimated_difficulty, topic_category }`
- **Teacher**: Markdown with `## 🧠 What This Is Really About` and `## 💡 The Key Things You Need to Know`
- **Action Agent**: Markdown with Do Today (3 items), This Week (3 milestones), 30-Day Challenge (1),
  Resources, How to Know It's Working (3 metrics)

**Rationale**: Agents are stateless and compose via contracts. Any shape mismatch silently corrupts
downstream outputs. Failures are data — identify the broken contract, not just the symptom.

### III. Sequential Phase Execution (NON-NEGOTIABLE)

Build phases MUST be completed in order (0 → 10). Each phase has a defined exit condition that MUST
be met before the next phase begins. No phase MAY be skipped under any circumstances.

Phase exit conditions are authoritative as defined in `CLAUDE.md`. The current phase status MUST be
recorded in `SPEC.md` after each phase completes.

**Rationale**: Each phase's output is a dependency for the next. Skipping phases creates invisible
debt that compounds into integration failures at polish time.

### IV. project_context Isolation (NON-NEGOTIABLE)

The `project_context` string MUST be passed to the **Action Agent and only the Action Agent**.
No other agent (Fetcher, Analyst, Teacher, Orchestrator) MUST receive or reference it. Every task
the Action Agent produces MUST be impossible to write without knowing both the video content AND
the user's specific project context. Generic, video-agnostic tasks are contract violations.

**Rationale**: The `project_context` is the core differentiator of LearnAgent. Diluting it across
agents would break its specificity guarantee and erode the product's primary value proposition.

### V. Clean UI Boundary (NON-NEGOTIABLE)

Internal methodology terms — including but not limited to "orchestrator", "relay pattern", "agent",
"fetcher", "analyst", "teacher", "action agent", and any pipeline-specific vocabulary — MUST NEVER
appear in any visible UI text: error messages, button labels, placeholders, loading states, or
page copy.

**Rationale**: Users are learners, not engineers. Internal naming exposed in the UI signals
implementation leakage and degrades product credibility.

## Tech Stack & Architecture Constraints

The following technology choices are fixed for this project and MUST NOT be substituted without
founder approval and a SPEC update:

| Layer | Technology | Constraint |
|---|---|---|
| Framework | Next.js 14 App Router + TypeScript | App Router only; no Pages Router |
| Styling | Tailwind CSS | No other CSS framework |
| Database + Auth | Supabase (PostgreSQL + RLS + Google OAuth) | RLS MUST be enabled on all tables |
| AI Agents | Anthropic Claude API (`claude-sonnet-4-6`) | Model ID is pinned; do not upgrade without testing |
| Transcript | Supadata.ai (fallback: RapidAPI) | Supadata is primary; RapidAPI is fallback only |
| Charts | Recharts | No substitution |
| Email | Resend or Supabase Edge Functions | Interchangeable; document which is active in SPEC.md |
| Deployment | Vercel | No other deployment target for production |

**Pipeline constraint**: The Orchestrator is the sole relay between agents. It MUST NOT summarize,
interpret, or transform agent output — only forward it according to the pipeline contract.

**Database schema (canonical)**:
- `reports` — id, user_id, video_id, video_url, title, topic_category, estimated_difficulty,
  project_context, status, created_at
- `report_sections` — id, report_id, section_type (concept|highlights|models|examples|actions),
  content_json, created_at
- `tasks` — id, report_id, user_id, label, scope (today|week|month), completed, completed_at,
  created_at

## Development Workflow

**Session start**: Every session MUST begin by reading `youtube gen master.md` in full, then
reading `SPEC.md` to identify the current build phase, then stating what will be built and waiting
for founder confirmation before writing any code.

**File access rules**:
- `youtube gen master.md` — Read-only. MUST NOT be modified during any build session.
- `SPEC.md` — MUST be updated after each phase completes to reflect current status.
- `CLAUDE.md` — Read-only. MUST NOT be modified.
- `agents/*.ts` — MUST only be modified to fix contract violations. Output MUST be verified after
  every change.

**Failure protocol**: When an agent fails, the builder MUST identify which contract field was
violated, fix the agent, retry the pipeline, and document the failure + fix in `SPEC.md`. Failures
are not blockers; they are diagnostic data.

**Performance gate (Phase 3)**: A POST to `/api/analyze` with a real YouTube URL and
`project_context` MUST return a complete, contract-valid report in under 90 seconds. If this gate
is not met, Phase 3 is not complete.

## Governance

This constitution supersedes all other practices, preferences, and conventions in this repository.
In any conflict between this constitution and another source, this constitution wins.

**Amendment procedure**: Any amendment to this constitution MUST be proposed explicitly, version
bumped according to semantic rules (MAJOR for principle removal/redefinition, MINOR for additions,
PATCH for clarifications), and recorded in the Sync Impact Report comment at the top of this file.
Dependent templates MUST be reviewed and updated as part of every amendment.

**Versioning policy**:
- MAJOR: Removing or redefining a principle (e.g., relaxing a NON-NEGOTIABLE constraint).
- MINOR: Adding a new principle, section, or materially expanding guidance.
- PATCH: Wording clarifications, typo fixes, formatting, non-semantic changes.

**Compliance**: All plan.md files MUST include a Constitution Check gate. All code review MUST
verify compliance with Principles I–V before approving. Any PR that violates a NON-NEGOTIABLE
principle MUST be blocked regardless of other merits.

**Runtime guidance**: Use `CLAUDE.md` and `youtube gen master.md` for session-level development
guidance. This constitution governs architecture and process invariants only.

---

**Version**: 1.0.0 | **Ratified**: 2026-03-27 | **Last Amended**: 2026-03-27
