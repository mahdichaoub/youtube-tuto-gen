# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**LearnAgent** — an execution layer for self-directed learning. It transforms YouTube videos into actionable, project-specific course modules via a multi-agent AI pipeline. The key differentiator is `project_context`: a user-supplied string about what they are currently building, which anchors every generated action plan to real work.

The full spec lives in `youtube gen master.md`. Read it before writing any code.

---

## Session Start Protocol

Before every session:
1. Read `youtube gen master.md` completely.
2. Read `SPEC.md` and identify the current build phase.
3. State what you are about to build and wait for confirmation.
4. Never skip a phase — each has a defined exit condition that must be met.

---

## Commands

```bash
# Development
npm run dev

# Local pipeline test
./claude-code-runner.sh "https://youtube.com/watch?v=VIDEO_ID" "Your project context"

# Supabase local dev
npx supabase start
npx supabase db push

# Deploy
vercel --prod

# Test transcript API
curl "https://api.supadata.ai/v1/youtube/transcript?videoId=VIDEO_ID&lang=en" \
  -H "x-api-key: $SUPADATA_API_KEY"

# Test full pipeline locally
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://youtube.com/watch?v=VIDEO_ID","project_context":"Building a SaaS app"}'
```

---

## Environment Variables

Create `.env.local` before Phase 3. Add to `.gitignore` before committing.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
SUPADATA_API_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS |
| Database + Auth | Supabase (PostgreSQL + RLS + Google OAuth) |
| AI Agents | Anthropic Claude API (`claude-sonnet-4-6`) |
| Transcript | Supadata.ai (fallback: RapidAPI YouTube Transcript) |
| Charts | Recharts |
| Email | Resend or Supabase Edge Functions |
| Deployment | Vercel |

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
    Save to Supabase → return report_id
```

Agents are stateless and contract-driven. The Orchestrator is the sole relay — it never summarizes content itself.

### The `project_context` Rule (Sacred)

`project_context` is passed to the **Action Agent and only the Action Agent**. No other agent receives it. Every task the Action Agent produces must be impossible to write without knowing both the video content AND the user's project context. Generic tasks are contract violations.

### Data Contracts (Law)

Every agent's output must match its contract before the Orchestrator proceeds. Contracts are defined in `youtube gen master.md` Section 2.4. Verify against the contract before marking any agent complete.

**Fetcher output:** `{ video_id, video_url, title, transcript_length, language, is_partial, transcript }`

**Analyst output:** `{ video_id, core_concept (one sentence), key_highlights (5–7), mental_models, examples_used, warnings_and_mistakes, key_terms, estimated_difficulty, topic_category }`

**Teacher output:** Markdown with required sections `## 🧠 What This Is Really About` and `## 💡 The Key Things You Need to Know`

**Action Agent output:** Markdown with all sections required — Do Today (3 items), This Week (3 milestones), 30-Day Challenge (1, video+project specific), Resources, How to Know It's Working (3 metrics)

**Database schema:**
- `reports` — id, user_id, video_id, video_url, title, topic_category, estimated_difficulty, project_context, status, created_at
- `report_sections` — id, report_id, section_type (concept|highlights|models|examples|actions), content_json, created_at
- `tasks` — id, report_id, user_id, label, scope (today|week|month), completed, completed_at, created_at

---

## File Structure

```
learnagent/
├── app/
│   ├── (auth)/login, signup
│   ├── (app)/home, process/[id], report/[id], library, progress, settings
│   └── api/analyze, reports, tasks, share/[id], notifications
├── agents/
│   ├── orchestrator.ts  ← pipeline manager, sole relay
│   ├── fetcher.ts       ← transcript retrieval only
│   ├── analyst.ts       ← structured content analysis
│   ├── teacher.ts       ← plain-language educator
│   └── action.ts        ← project-specific action plan
├── lib/supabase/, anthropic/, supadata/
├── components/ui/, report/, library/, dashboard/
└── supabase/migrations/
```

---

## Build Phases (Sequential — Never Skip)

| Phase | Name | Exit Condition |
|---|---|---|
| 0 | Spec & Setup | Claude can describe every agent contract and the project_context flow |
| 1 | Database Schema | All tables exist with RLS; test insert/select succeeds |
| 2 | Authentication | Full auth flow works end-to-end; session persists on refresh |
| 3 | Agent Pipeline | POST with real URL + project_context returns complete report in <90s |
| 4 | Home Screen | Form submission works; project_context is sent; navigation correct |
| 5 | Processing Screen | Real-time agent progress visible; automatic navigation on completion |
| 6 | Report Cards | All 5 cards render; project_context label visible on Card 5; task completion persists |
| 7 | Share, Export, Notifications | Share link opens without login; copy produces valid Markdown; test email sends |
| 8 | Library | Searchable report archive works with real data |
| 9 | Progress Dashboard | All stats render with real Supabase data |
| 10 | Polish | Full end-to-end pass; all UX rules verified |

---

## Non-Negotiable Rules

1. **Spec First** — Never generate a file or write code without checking `youtube gen master.md` first. If what you're about to build isn't in the spec, ask before building it.
2. **Contracts Are Law** — Verify every agent's output against its data contract before proceeding.
3. **Never Skip a Phase** — Meet each phase's exit condition before moving to the next.
4. **No Internal Terminology in UI** — The words "orchestrator", "relay pattern", or any internal methodology term must never appear in any visible UI text, error message, button label, or placeholder.
5. **Failures Are Data** — When an agent fails, identify which contract was violated, fix the agent, retry. Document in `SPEC.md`.

---

## File Rules

- `youtube gen master.md` — Read-only. Never modify during a build session.
- `SPEC.md` — Update current phase status after completing each phase.
- `CLAUDE.md` — Read-only. Never modify.
- `agents/*.ts` — Modify only to fix contract violations. Verify output after every change.
