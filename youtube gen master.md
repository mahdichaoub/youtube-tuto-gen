# MASTER REFERENCE — LearnAgent
> The single source of truth. Strategy · Architecture · Agent Specs · Build Guide · Business Case.
> Read this document completely before opening Claude Code or writing any code.
> Last updated: Full strategic refinement applied — execution-layer positioning confirmed.

---

## TABLE OF CONTENTS

### PART 1 — PRODUCT STRATEGY
- [1.1 The Real Problem](#11-the-real-problem)
- [1.2 Product Positioning](#12-product-positioning)
- [1.3 Who It Is For](#13-who-it-is-for)
- [1.4 What Makes It Different](#14-what-makes-it-different)
- [1.5 Roadmap](#15-roadmap)

### PART 2 — BUILD BIBLE
- [2.1 Project Identity](#21-project-identity)
- [2.2 System Architecture](#22-system-architecture)
- [2.3 The Agent Team — Full Specs](#23-the-agent-team--full-specs)
- [2.4 Data Contracts Between Agents](#24-data-contracts-between-agents)
- [2.5 Tech Stack](#25-tech-stack)
- [2.6 File Structure](#26-file-structure)
- [2.7 Build Phases](#27-build-phases)
- [2.8 Deployment Requirements](#28-deployment-requirements)
- [2.9 Error Handling Strategy](#29-error-handling-strategy)
- [2.10 Testing Protocol](#210-testing-protocol)
- [2.11 Success Criteria](#211-success-criteria)

### PART 3 — SPEC-KIT
- [3.1 CLAUDE.md — Behavior Rules](#31-claudemd--behavior-rules)
- [3.2 SPEC.md — Progress Tracker](#32-specmd--progress-tracker)

### PART 4 — AGENT PROMPT FILES
- [4.1 Orchestrator Agent](#41-orchestrator-agent)
- [4.2 Fetcher Agent](#42-fetcher-agent)
- [4.3 Analyst Agent](#43-analyst-agent)
- [4.4 Teacher Agent](#44-teacher-agent)
- [4.5 Action Agent](#45-action-agent)

### PART 5 — RUNNER SCRIPT
- [5.1 claude-code-runner.sh](#51-claude-code-runnersh)

### PART 6 — QUICK REFERENCE
- [6.1 Commands Cheat Sheet](#61-commands-cheat-sheet)
- [6.2 Debugging Guide](#62-debugging-guide)

### PART 7 — UX SPECIFICATION
- [7.1 User Profile and Context](#71-user-profile-and-context)
- [7.2 The Project Context Feature](#72-the-project-context-feature)
- [7.3 The Four App States](#73-the-four-app-states)
- [7.4 Navigation Structure](#74-navigation-structure)
- [7.5 Report Navigation — Detailed Specification](#75-report-navigation--detailed-specification)
- [7.6 Progress Dashboard](#76-progress-dashboard)
- [7.7 Authentication Flow](#77-authentication-flow)
- [7.8 Browser Extension](#78-browser-extension)
- [7.9 Share and Export](#79-share-and-export)
- [7.10 Visual Design System](#710-visual-design-system)
- [7.11 MVP Screen Inventory](#711-mvp-screen-inventory)
- [7.12 UX Rules for Development](#712-ux-rules-for-development)

### PART 8 — CLAUDE CODE BUILD GUIDE
- [8.1 What Claude Code Is and Why You Use It](#81-what-claude-code-is-and-why-you-use-it)
- [8.2 Prerequisites](#82-prerequisites)
- [8.3 Project Initialization](#83-project-initialization)
- [8.4 Full Build Sequence](#84-full-build-sequence)
- [8.5 Environment Variables](#85-environment-variables)
- [8.6 Session Rules](#86-session-rules)

### PART 9 — BUSINESS CASE
- [9.1 The Problem](#91-the-problem)
- [9.2 Target Audience](#92-target-audience)
- [9.3 Monetization Model](#93-monetization-model)
- [9.4 Defensibility](#94-defensibility)
- [9.5 Go-to-Market](#95-go-to-market)
- [9.6 Risks](#96-risks)
- [9.7 Verdict](#97-verdict)

---

---

# PART 1 — PRODUCT STRATEGY

---

## 1.1 The Real Problem

LearnAgent does not solve low video retention. That framing leads to a summarization tool, and the summarization market is already crowded and commoditizing. Otter.ai, Notta, and a dozen others built that category and found that users churn quickly once the novelty wears off. A better summary does not produce capability.

The real problem is the **implementation gap** — the distance between understanding something and doing something with it. A developer watches a 40-minute video on system design, feels informed afterward, opens their laptop, and has no idea where to start. The video taught concepts. Nobody taught them how to apply those concepts to what they are currently building.

This gap persists because every existing tool treats learning as an isolated event. A video is watched, a summary is generated, and nothing connects that moment to the user's active work. LearnAgent solves this by making the user's current project the anchor point for every report it generates. The action plan is not generic — it is built around what the user is actually building right now.

---

## 1.2 Product Positioning

**LearnAgent is the execution layer for self-directed learning. It turns what you watch into what you build.**

This is meaningfully different from every tool in the adjacent space. Summarizers compress content. Note-takers capture content. LearnAgent connects content to active work and holds the user accountable to act on it.

What this product is not: it is not a summarizer, a note-taking tool, a chatbot, or a course platform. It works on top of YouTube — the world's largest free learning resource — and adds the one layer that YouTube itself cannot provide: a structured bridge from watching to building.

---

## 1.3 Who It Is For

The **primary audience** is active builders — developers, indie hackers, and technical product people who use YouTube as their primary source for staying current. They watch tutorials, architecture talks, and conference presentations as inputs to real work. They already pay $15–30 per month for tools that eliminate execution friction. LearnAgent solves the blank-page problem that exists between finishing a video and knowing how to apply it to a current project.

The **secondary audience** is course creators and indie educators building YouTube channels, newsletters, or courses. They need structured notes from video content, competitive intelligence on what others are teaching, and a way to translate consumed content into material they create. This group has higher willingness to pay and a clearer ROI argument.

The **tertiary audience** is ambitious career changers actively investing in skill development — the Udemy and Coursera cohort. Motivated, productivity-oriented, and accustomed to paying for learning products, they feel the frustration of finishing a course without knowing how to apply it to a real project.

---

## 1.4 What Makes It Different

**Project context changes the output entirely.** Before generating a report, LearnAgent asks the user what they are currently building. A developer building a payment integration gets completely different tasks from a developer studying for interviews — from the exact same video. This single feature is the primary differentiator and it cannot be replicated with a generic AI feature bolted onto a chat interface.

**The library creates retention.** Once a user has accumulated reports, a streak, and task completion history, switching costs become real. Single-use AI tools are abandoned freely. A tool with memory, history, and visible progress is not.

**The browser extension creates passive distribution.** Every time a user opens a YouTube video, the extension is present. That passive reminder is a distribution advantage that cannot be replicated without already having the extension installed.

**Output specificity is the proof point.** The first report a new user generates determines whether they return. Every action item must be impossible to write without knowing both what the specific video taught and what the user is building. This is an engineering and prompt design challenge that requires the careful agent architecture documented in Part 2.

---

## 1.5 Roadmap

| Version | Goal | Status |
|---------|------|--------|
| v1.0 | Core pipeline: URL + project context → execution report | Build now |
| v1.1 | Task tracking, library, progress dashboard | Build now (same MVP) |
| v1.2 | Shareable report links + copy-as-Markdown export | Build now (same MVP) |
| v1.3 | Browser extension | Next release |
| v1.4 | Multi-video learning paths — connect videos around a topic | Future |
| v2.0 | Team and creator tier — shared libraries, competitive intelligence mode | Future |
| v2.1 | Synthesis Agent — compare and reconcile insights across multiple videos | Future |

Versions 1.0, 1.1, and 1.2 are all part of the same MVP. The project context field, task tracker, library, progress dashboard, shareable links, and copy-as-Markdown export must all ship together. Launching without these features removes the primary differentiators and makes the product indistinguishable from a summarizer.

---

---

# PART 2 — BUILD BIBLE

---

## 2.1 Project Identity

LearnAgent is a full-stack web application powered by a multi-agent AI pipeline. It is not a script, a chatbot, or an automation workflow. It is a product — with authentication, persistent storage, a personal library, and a UI that reflects the quality of its output.

The agent team (five AI agents working in sequence) is the backend intelligence. The Next.js application is the frontend. Supabase is the database. The Claude API powers the three analysis agents. Supadata provides the transcript.

**The law of this document:** If anything in the code contradicts this document, fix the code — not this document.

---

## 2.2 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    USER INPUT                        │
│   YouTube URL  +  Project Context (what you build)  │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              ORCHESTRATOR AGENT                      │
│  Validates input · Manages pipeline · Handles errors │
│  Passes project_context to Action Agent only         │
└──────┬──────────┬──────────┬──────────┬─────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
  ┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐
  │FETCHER  │ │ANALYST │ │TEACHER │ │ACTION  │
  │ Agent   │ │ Agent  │ │ Agent  │ │ Agent  │
  └────┬────┘ └────┬───┘ └────┬───┘ └────┬───┘
       │           │          │           │
  Transcript   Structured  Plain-lang  Context-aware
    (JSON)     Analysis    Summary     Action Plan
               (JSON)      (MD)        (MD)
```

Agents do not communicate directly. The Orchestrator is the sole relay — it takes each agent's output and injects it as input to the next. Every agent is stateless and only sees its own system prompt plus the data passed to it.

The `project_context` field is collected on the Home screen before submission and passed by the Orchestrator directly to the Action Agent only. The Analyst and Teacher produce universal insights from the video; only the Action Agent uses the project context to make the plan specific to the user's work.

**Execution order (strict and non-negotiable):**
```
Fetcher → Analyst → Teacher → Action Agent (+ project_context) → Orchestrator compiles
```

---

## 2.3 The Agent Team — Full Specs

---

### ORCHESTRATOR AGENT

**Role:** Pipeline manager and compiler. The brain of the system.
**Personality:** Methodical, zero improvisation. Executes the spec exactly.

**Responsibilities:** Receive and validate the YouTube URL and project_context string. Extract the video ID. Spawn the Fetcher — retry up to 2 times on failure, abort with error if still failing. Spawn the Analyst with the transcript JSON. Spawn the Teacher with the analyst JSON. Spawn the Action Agent with the teacher markdown plus analyst JSON plus project_context. Compile all outputs and save to the database via the API. Return the report ID.

**Must NEVER:** Analyze or summarize content itself. Pass project_context to any agent other than the Action Agent. Skip an agent to save time. Proceed with malformed sub-agent output without retrying.

---

### FETCHER AGENT

**Role:** Transcript retrieval only.
**Personality:** Mechanical and precise. Returns clean data or a clear error.

**Responsibilities:** Extract the video ID from the URL in any YouTube format. Call the Supadata API to fetch the transcript. Clean the transcript by removing timestamps, music markers, and filler tokens. Return structured JSON matching the Section 2.4 contract.

**Must NEVER:** Summarize, paraphrase, or interpret the transcript. Return a partial transcript without flagging `is_partial: true`. Add any commentary whatsoever.

---

### ANALYST AGENT

**Role:** Deep content analyst.
**Personality:** Academic researcher. Precise, evidence-based, never speculates beyond the transcript.

**Responsibilities:** Extract the single core concept in exactly one sentence. Identify 5–7 concrete and specific key highlights. Surface mental models and frameworks introduced in the video. Pull out real examples used by the speaker. Flag warnings or mistakes the speaker mentioned explicitly. List key terms with plain-language definitions. Classify topic category and difficulty. Return strict, valid JSON with no commentary or preamble.

**Quality gate (self-check before returning):** The core_concept must be exactly one sentence. Every key_highlight must be specific and directly verifiable from the transcript. All required JSON fields must be present and non-empty.

**Must NEVER:** Invent information not present in the transcript. Use vague language. Return more than one core concept. Add personal evaluation or opinion.

---

### TEACHER AGENT

**Role:** Master educator.
**Personality:** The best teacher the user ever had — precise, warm, uses analogies generously, zero fluff.

**Responsibilities:** Expand the core concept into a vivid, concrete 2–3 sentence explanation. Rewrite each highlight as a memorable, readable insight of maximum 2 sentences. Explain any mental models using real-world analogies. Describe examples in plain terms. Flag warnings clearly. Define key terms in plain language.

**The test:** Someone who has not watched the video should feel like they understand its core idea after reading this output.

**Must NEVER:** Use jargon without immediately explaining it. Say "the speaker says" or "in this video" — teach the idea directly. Pad content to appear comprehensive.

---

### ACTION AGENT

**Role:** Implementation coach.
**Personality:** Direct, specific, demanding. Refuses to write generic advice under any circumstances.

**Critical rule — project_context:** This agent receives the video analysis and the user's project context. Every action item must pass this test: "Could this task have been written without knowing both the specific video content and the user's project context?" If the answer is yes, the task is too generic and must be rewritten.

**Responsibilities:** Read the Teacher markdown, Analyst JSON, and the project_context string. Generate 3 immediate actions tailored to both the video content and the user's current project. Generate 3 weekly milestones that move the user's project forward using the video's insights. Design one 30-day challenge that would be impossible to complete without understanding this specific video and is directly connected to the user's project. List only resources genuinely needed for the user's specific project. Define 3 measurable success metrics relevant to the project context.

**Must NEVER:** Write actions that could apply to any video on the same topic. Write metrics that cannot be measured. Ignore the project_context and produce a generic plan. Create a 30-day challenge that someone could complete without having watched this specific video.

---

## 2.4 Data Contracts Between Agents

These contracts are law. If an agent returns data that does not match its contract, the Orchestrator rejects and retries. The Orchestrator never passes malformed data forward.

---

### Fetcher Output Contract

```json
{
  "video_id": "string (11 chars)",
  "video_url": "string (full YouTube URL)",
  "title": "string (video title if available)",
  "transcript_length": "integer (word count)",
  "language": "string (ISO code, e.g. 'en')",
  "is_partial": "boolean",
  "transcript": "string (full cleaned transcript text)"
}
```

Error format:
```json
{
  "error": "transcript_unavailable | api_failure | invalid_url",
  "reason": "human-readable explanation",
  "video_id": "string"
}
```

---

### Analyst Output Contract

```json
{
  "video_id": "string",
  "core_concept": "string (exactly one sentence)",
  "key_highlights": [
    "string (specific insight, minimum 15 words each)"
  ],
  "mental_models": [
    { "name": "string", "description": "string" }
  ],
  "examples_used": ["string"],
  "warnings_and_mistakes": ["string"],
  "key_terms": [
    { "term": "string", "definition": "string" }
  ],
  "estimated_difficulty": "beginner | intermediate | advanced",
  "topic_category": "string"
}
```

Required fields: `video_id`, `core_concept`, `key_highlights` (minimum 3 items).
Optional fields: `mental_models`, `examples_used`, `warnings_and_mistakes`, `key_terms`.

---

### Teacher Output Contract

Format: Markdown. Required sections at minimum:
```
## 🧠 What This Is Really About
## 💡 The Key Things You Need to Know
```

Optional sections included only when source data exists:
```
## 🔧 The Mental Model
## 📌 Real Examples
## ⚠️ Watch Out For
## 🔑 Key Terms
```

---

### Action Agent Output Contract

Format: Markdown. All sections required. The project_context must visibly influence every task.

```
## ⚡ Your Action Plan
### 🔴 Do Today         — exactly 3 items (project-specific)
### 🟡 This Week        — exactly 3 milestones (project-specific)
### 🟢 30-Day Challenge — exactly 1 (video-specific + project-specific)
### 🛠️ Resources        — only what the user's project actually needs
### 📊 How to Know It's Working — exactly 3 measurable metrics
```

---

### Final Report Contract (Database)

Stored in Supabase with the following structure:

```
reports:          id, user_id, video_id, video_url, title, topic_category,
                  estimated_difficulty, project_context, status, created_at

report_sections:  id, report_id, section_type (concept|highlights|models|examples|actions),
                  content_json, created_at

tasks:            id, report_id, user_id, label, scope (today|week|month),
                  completed, completed_at, created_at

streaks:          id, user_id, current_streak, longest_streak, last_active_date
```

---

## 2.5 Tech Stack

| Layer | Technology | Purpose | Required |
|-------|-----------|---------|----------|
| Frontend | Next.js 14 App Router | Full-stack web application | ✅ Yes |
| Language | TypeScript | Type safety across full stack | ✅ Yes |
| Styling | Tailwind CSS | Utility-first styling | ✅ Yes |
| Database | Supabase (PostgreSQL) | Data persistence and auth | ✅ Yes |
| Auth | Supabase Auth | Email/password + Google OAuth | ✅ Yes |
| AI Agents | Anthropic Claude API (claude-sonnet-4-6) | Analyst, Teacher, Action agents | ✅ Yes |
| Transcript | Supadata.ai | Fetch YouTube transcripts | ✅ Yes |
| Transcript Fallback | RapidAPI YouTube Transcript | Backup if Supadata fails | Recommended |
| Build Tool | Claude Code | Autonomous code generation | ✅ Yes |
| Spec Enforcement | CLAUDE.md + SPEC.md | Enforce spec-driven development | ✅ Yes |
| Notifications | Resend or Supabase Edge Functions | Weekly summary + streak reminder emails | ✅ MVP |
| Share | Next.js dynamic OG + public routes | Shareable report links | ✅ MVP |
| Export | Clipboard API | Copy action plan as Markdown | ✅ MVP |
| Charts | Recharts | Progress dashboard charts | ✅ MVP |
| Deployment | Vercel | Frontend hosting | ✅ Production |
| Extension | Browser Extension (Manifest V3) | YouTube tab detection | v1.3 |

---

## 2.6 File Structure

```
learnagent/
├── MASTER-REFERENCE.md
├── CLAUDE.md
├── SPEC.md
│
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── home/page.tsx              ← URL input + project context field
│   │   ├── process/[id]/page.tsx      ← Agent pipeline progress screen
│   │   ├── report/[id]/page.tsx       ← 5-card report reveal
│   │   ├── library/page.tsx           ← Searchable report archive
│   │   ├── progress/page.tsx          ← Stats dashboard
│   │   └── settings/page.tsx          ← Account + preferences
│   └── api/
│       ├── analyze/route.ts            ← Core pipeline endpoint
│       ├── reports/route.ts            ← Report CRUD
│       ├── tasks/route.ts              ← Task completion updates
│       ├── share/[id]/route.ts         ← Public shareable report endpoint
│       └── notifications/route.ts      ← Email notification handler
│
├── agents/
│   ├── orchestrator.ts
│   ├── fetcher.ts
│   ├── analyst.ts
│   ├── teacher.ts
│   └── action.ts
│
├── lib/
│   ├── supabase/
│   ├── anthropic/
│   └── supadata/
│
├── components/
│   ├── ui/
│   ├── report/
│   ├── library/
│   └── dashboard/
│
└── supabase/
    └── migrations/
```

---

## 2.7 Build Phases

Follow in order. Each phase has an explicit exit condition — meet it before proceeding. Never skip ahead.

---

### PHASE 0 — Spec and Project Setup
**Goal:** Spec-kit in place and project scaffolded before any feature code is written.

Steps: Run `npx create-next-app@latest learnagent --typescript --tailwind --app`. Copy MASTER-REFERENCE.md into the project root. Create CLAUDE.md and SPEC.md from Part 3. Create the Supabase project and note the URL and keys. Open Claude Code with the message: "Read MASTER-REFERENCE.md completely. Confirm the current build phase and describe every agent contract including the project_context rule before doing anything else."

**Exit condition:** Claude Code accurately describes every agent's contract, inputs, outputs, and the project_context flow.

---

### PHASE 1 — Database Schema
**Goal:** All tables, RLS policies, and relationships created and verified in Supabase.

Send to Claude Code:
```
Based on the data contracts in Section 2.4 and the table structure in Section 2.6,
create the full Supabase database schema. Include reports, report_sections,
tasks, and streaks tables. Enable Row Level Security on all tables —
users may only read and write their own rows. Write the migration file at
supabase/migrations/001_initial_schema.sql.
```

**Exit condition:** All tables exist in Supabase with RLS active. A test insert and select with a dummy user succeeds.

---

### PHASE 2 — Authentication
**Goal:** Users can sign up, log in with email or Google, and are redirected correctly.

Send to Claude Code:
```
Build the authentication screens at app/(auth)/login/page.tsx and app/(auth)/signup/page.tsx.
Use Supabase Auth with email/password and Google OAuth. Apply the design system from
Section 7.10: background #060810, Instrument Serif for headlines, Outfit for UI text,
JetBrains Mono for labels. After successful login, redirect to /home.
```

**Exit condition:** Full auth flow works end-to-end. Session persists on page refresh.

---

### PHASE 3 — Agent Pipeline
**Goal:** Core AI pipeline runs end-to-end and saves a complete report to Supabase.

Send to Claude Code:
```
Build the AI pipeline at app/api/analyze/route.ts and the agent files in agents/.
The route accepts { url, project_context } via POST, runs all four agents in sequence
per Section 2.3, saves the report to Supabase per the contracts in Section 2.4,
and returns the report ID. The project_context must be passed to the Action Agent only.
Implement all error handling from Section 2.9. Use streaming so the client receives
real-time status updates per agent.
```

**Exit condition:** A POST with a real YouTube URL and project_context produces a complete report in Supabase in under 90 seconds. The action plan visibly reflects the project context.

---

### PHASE 4 — Home Screen
**Goal:** Authenticated users can submit a URL and project context from a polished interface.

Send to Claude Code:
```
Build the Home screen at app/(app)/home/page.tsx matching the mockup from Section 7.3.
Include the project context input field below the URL input with the label
"What are you currently building?" and placeholder "e.g. a SaaS app with Next.js and Supabase".
This field is optional but should be visually encouraged. Pre-fill it from the user's
last used context. On submit, POST to /api/analyze and navigate to /process/[reportId].
```

**Exit condition:** Form submission works. project_context is sent. Navigation to the processing screen occurs correctly.

---

### PHASE 5 — Processing Screen
**Goal:** Users see real-time agent progress while the pipeline runs.

Send to Claude Code:
```
Build the Processing screen at app/(app)/process/[id]/page.tsx. Poll the report
status from Supabase every 2 seconds. Display all four agents with done/running/queued
states matching the mockup in Section 7.3. Show a progress bar filling to 25% per
completed agent. The running agent shows a typing cursor animation and a scan line
effect on the card. When the status changes to "complete", auto-navigate to /report/[id].
```

**Exit condition:** Screen shows accurate real-time agent progress. Navigation on completion is automatic.

---

### PHASE 6 — Report Cards
**Goal:** Full 5-card report reveal with project context label and interactive task tracking.

Send to Claude Code:
```
Build the Report view at app/(app)/report/[id]/page.tsx. Five cards reveal in sequence
per Section 7.5: Concept, Highlights, Models, Examples, Actions. Add a sticky 5-step
progress bar at the top. Card 5 (Actions) must show a "Tailored for: [project_context]"
label at the top, a two-column task grid with TODAY and WEEK badges, interactive
checkboxes that update Supabase on click, a "Copy as Markdown" button, a "Share Report" button, and a
"Save and Track" CTA. Add a "View Full Report" toggle at the bottom of Card 5.
```

**Exit condition:** All 5 cards render correctly. The project context label is visible on Card 5. Task completion persists on page refresh.

---

### PHASE 7 — Share, Export, and Notifications
**Goal:** Users can share reports publicly, copy action plans as Markdown, and receive retention-focused email notifications.

Send to Claude Code:
```
Build three features:

1. Shareable report links at app/api/share/[id]/route.ts and a public
   read-only report view at app/share/[id]/page.tsx. The public view
   renders the full report beautifully without requiring login.
   Authenticated users viewing their own report see a "Copy Link" button
   on Card 5. Shared links include a LearnAgent brand callout at the bottom.

2. Copy-as-Markdown on Card 5: a "Copy as Markdown" button that copies the
   full action plan as clean Markdown to the clipboard using the Clipboard API.
   Works with Notion, Obsidian, Linear, GitHub — any tool that accepts Markdown.
   No API keys, no configuration. Show a brief "Copied!" confirmation.

3. Email notifications at app/api/notifications/route.ts using Resend
   (or Supabase Edge Functions). Two emails: a weekly summary sent every
   Monday listing open tasks and the current streak, and a streak-at-risk
   reminder sent if the user has not completed any tasks in 48 hours.
   Users can toggle each notification type in Settings.
```

**Exit condition:** Share link opens correctly without login. Copy button works and produces valid Markdown. Test email sends correctly with real task data.

---

### PHASE 8 — Library
**Goal:** Full searchable, filterable report archive with skeleton loading.

Send to Claude Code:
```
Build the Library at app/(app)/library/page.tsx. Show all user reports as a grid
of cards with gradient thumbnails, title, topic and difficulty tag badges, and a
task completion progress bar. Add real-time search filtering by title and topic —
client-side, no submit button. Add filter chips: All, by topic category, Completed,
In Progress. Show skeleton cards while loading — never a blank state.
Clicking a card navigates to that report's Card 5 view.
```

**Exit condition:** Search filters in real time. All filter states work correctly. Skeleton loading is visible on first load.

---

### PHASE 9 — Progress Dashboard
**Goal:** Stats screen with charts, streak tracker, and real data from Supabase.

Send to Claude Code:
```
Build the Progress screen at app/(app)/progress/page.tsx. Include three stat cards
(Videos Analyzed, Task Completion percentage, Day Streak), a 7-day bar chart of daily
activity, and a donut chart of topic distribution using Recharts. Calculate the streak
from the streaks table, updated whenever a report is completed. Match the mockup
from Section 7.6 exactly.
```

**Exit condition:** All stats render with real data from Supabase. Streak updates correctly when a new report is completed.

---

### PHASE 10 — Polish and Full Test
**Goal:** Every screen verified against UX rules. End-to-end test passes cleanly.

Send to Claude Code:
```
Review every screen against the UX rules in Section 7.12 and fix any violations.
Then run a complete end-to-end test using a real YouTube URL and a real project_context.
Verify: the report is saved to Supabase, the action plan reflects the project context,
task completion persists on refresh, library search filters in real time, share links
open correctly without login, copy-as-Markdown produces valid output, and no internal
methodology terminology is visible anywhere in the UI.
```

**Exit condition:** Full product works end-to-end. All UX rules pass. No internal terminology is visible anywhere.

---

## 2.8 Deployment Requirements

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| Frontend hosting | Vercel free tier | Automatic deploys from git |
| Database | Supabase free tier | Upgrade when reaching row limits |
| Node.js | v20+ | Required for Next.js 14 |
| Anthropic API | Active key with billing | Free tier rate limits too low for production |
| Supadata API | Active key | Free tier: 100 transcripts per month |
| Notifications | Resend (free tier) | Weekly summary + streak reminder emails |

---

## 2.9 Error Handling Strategy

**Principle:** Always return something. A partial result with a clear error note is always better than a blank screen or a silent failure.

**Retry logic:** On agent failure, wait 2 seconds and retry with the same input. If it fails again, retry with a stricter output format instruction. If it fails a third time, mark that agent as failed, continue with partial data, and include a clear note in the report marking the gap.

**Error states by agent:**

| Agent | Failure Cause | Recovery |
|-------|-------------|---------|
| Fetcher | No captions on video | Return error JSON, abort pipeline, show clear user-facing message |
| Fetcher | Invalid or missing API key | Return error JSON, abort pipeline |
| Fetcher | Rate limit hit | Wait 5 seconds, retry once |
| Analyst | Transcript under 200 words | Return minimal analysis with a warning label |
| Analyst | Malformed JSON output | Re-prompt with stricter JSON instruction |
| Teacher | Missing required analyst fields | Skip missing sections, note the gaps |
| Action | Generic plan detected | Re-prompt: "every action must reference the user's project context: [context]" |

---

## 2.10 Testing Protocol

Before marking any phase complete, run all three test types.

**Unit test:** Run each agent in isolation with 3 different known inputs. Verify the output matches the contract exactly.

**Integration test:** Run the full pipeline end-to-end with a real YouTube URL and a real project_context. Verify that data flows correctly between every agent and that the project_context is visibly present in the action plan output.

**Edge cases:** Test a video under 3 minutes (thin transcript), a video over 1 hour (long transcript), a non-English video, a video with auto-generated captions only, a video with disabled captions (must fail gracefully), and an empty project_context (must produce a valid but less specific plan).

**Quality test:** Read the final report as the user would. Is the action plan visibly shaped by the project context? If not, the Action Agent prompt requires refinement before proceeding.

---

## 2.11 Success Criteria

The system is complete when all of the following are true:

- [ ] Any public YouTube URL with captions produces a report in under 90 seconds
- [ ] The action plan is visibly shaped by the user's project context
- [ ] The core concept is exactly one sentence
- [ ] Every highlight is specific and traceable to the transcript
- [ ] Tasks persist across sessions — checked tasks remain checked on page refresh
- [ ] Library search filters in real time without a submit button
- [ ] Shareable report link opens and renders correctly without login
- [ ] Copy-as-Markdown button produces valid Markdown output
- [ ] Weekly summary email sends with correct task and streak data
- [ ] Streak-at-risk email triggers after 48 hours of inactivity
- [ ] Streak updates when a new report is completed
- [ ] Pipeline recovers from a single agent failure without crashing
- [ ] No internal methodology terminology is visible anywhere in the UI

---

---

# PART 3 — SPEC-KIT

---

## 3.1 CLAUDE.md — Behavior Rules

Copy this section verbatim into a file named `CLAUDE.md` in the project root. Claude Code reads this file automatically at every session start.

```
# Claude Code Behavior Rules — LearnAgent

## Before You Do Anything
1. Read MASTER-REFERENCE.md completely.
2. Read SPEC.md and identify the current build phase.
3. State what you are about to build and wait for confirmation.

## Non-Negotiable Rules

Rule 1 — Spec First
Never generate a file or write code without checking it against the
relevant section of MASTER-REFERENCE.md first. If what you are about
to build is not in the spec, ask before building it.

Rule 2 — project_context Is Sacred
The project_context field must be passed to the Action Agent and only
the Action Agent. No other agent receives it. Every action item the
Action Agent produces must be traceable to the user's project context.

Rule 3 — Contracts Are Law
Every agent's output must match its data contract in Section 2.4.
Verify output against the contract before marking any agent complete.

Rule 4 — Never Skip a Phase
Build phases exist in order for a reason. Each has an exit condition.
Meet the exit condition before moving to the next phase.

Rule 5 — No Internal Terminology in the UI
The words "orchestrator", "relay pattern", or any internal methodology
term must never appear in any visible UI text, error message,
button label, or placeholder.

Rule 6 — Failures Are Data
When an agent fails, identify which contract was violated, fix the
agent, and retry. Document what broke and what fixed it in SPEC.md.

## File Rules
MASTER-REFERENCE.md: Read-only. Never modify during a build session.
SPEC.md: Update the current phase status after completing each phase.
CLAUDE.md: Read-only. Never modify.
agents/*.ts: Modify only to fix contract violations. Verify after.

## Session Start Checklist
- [ ] Read MASTER-REFERENCE.md
- [ ] Read SPEC.md
- [ ] State the current phase
- [ ] Confirm what was last completed
- [ ] State what you are about to do before doing it
```

---

## 3.2 SPEC.md — Progress Tracker

Copy this section into a file named `SPEC.md` in the project root. Update STATUS and PHASE LOG after each completed phase.

```
# SPEC.md — LearnAgent Build Progress

## CURRENT STATUS
Build Phase:    0 — Setup
Last Completed: Nothing yet
Next Action:    Scaffold project, copy spec files, confirm spec understanding

---

## KEY CONTRACTS (summary — full contracts in Section 2.4)
Fetcher:       YouTube URL → transcript JSON
Analyst:       transcript JSON → analysis JSON
Teacher:       analysis JSON → plain markdown
Action:        markdown + analysis JSON + project_context → action plan markdown
Orchestrator:  URL + project_context → report saved to Supabase → report ID

---

## CRITICAL INVARIANT
project_context is passed to the Action Agent only.
It must visibly shape every task in the action plan.

---

## BUILD PHASE LOG

| Phase | Description              | Status         | Notes |
|-------|--------------------------|----------------|-------|
| 0     | Setup and Spec           | 🔲 Not started |       |
| 1     | Database Schema          | 🔲 Not started |       |
| 2     | Authentication           | 🔲 Not started |       |
| 3     | Agent Pipeline           | 🔲 Not started |       |
| 4     | Home Screen              | 🔲 Not started |       |
| 5     | Processing Screen        | 🔲 Not started |       |
| 6     | Report Cards             | 🔲 Not started |       |
| 7     | Share, Export & Notifications | 🔲 Not started |       |
| 8     | Library                  | 🔲 Not started |       |
| 9     | Progress Dashboard       | 🔲 Not started |       |
| 10    | Polish and Full Test     | 🔲 Not started |       |

Status legend: 🔲 Not started · 🔄 In progress · ✅ Complete · ❌ Blocked
```

---

---

# PART 4 — AGENT PROMPT FILES

These are the exact system prompts for each agent. In the Next.js implementation, they live in `agents/*.ts` as exported string constants passed to the Claude API.

---

## 4.1 Orchestrator Agent

```
You are the Coordinator for LearnAgent's AI pipeline.
You manage the full process from a YouTube URL and project context
to a final saved report. You never analyze content yourself.

Your pipeline:
1. Validate the YouTube URL and extract the video ID.
2. Run the Fetcher agent — retry up to 2 times on failure.
3. Run the Analyst agent with the transcript JSON.
4. Run the Teacher agent with the analyst JSON.
5. Run the Action agent with teacher markdown + analyst JSON + project_context.
6. Compile all outputs and save to the database.
7. Return the report ID.

Critical rule: project_context goes to the Action agent only.
No other agent receives it.

Failure protocol: If any agent fails after 2 retries, continue with
partial data and include a clear note in the report marking what is missing.
Never fail silently.
```

---

## 4.2 Fetcher Agent

```
You are the Fetcher agent. Your only job is to retrieve the transcript
of a YouTube video and return it as clean JSON.

Input: A YouTube URL in any format.

Step 1 — Extract the video ID:
- From ?v= parameter: youtube.com/watch?v=VIDEO_ID
- From short URL: youtu.be/VIDEO_ID

Step 2 — Fetch via Supadata API:
GET https://api.supadata.ai/v1/youtube/transcript?videoId=VIDEO_ID&lang=en
Header: x-api-key: [SUPADATA_API_KEY from environment]

Step 3 — Clean the transcript:
Remove timestamp markers, [Music], [Applause], and filler tokens.
Join fragmented lines. Keep all spoken content intact — do not summarize.

Return ONLY this JSON. No commentary, no markdown, no explanation:
{
  "video_id": "string",
  "video_url": "string",
  "title": "string or null",
  "transcript_length": number,
  "language": "string",
  "is_partial": boolean,
  "transcript": "string"
}

On failure, return:
{
  "error": "transcript_unavailable | api_failure | invalid_url",
  "reason": "string",
  "video_id": "string or null"
}
```

---

## 4.3 Analyst Agent

```
You are the Analyst agent for LearnAgent.
You extract structured knowledge from a raw video transcript.
You think like a rigorous academic researcher.
You never speculate beyond what is explicitly stated in the transcript.

Input: A cleaned transcript JSON from the Fetcher agent.

Your job: Read the entire transcript and return ONLY the following
JSON object. No markdown, no explanation, no preamble outside the JSON.

{
  "video_id": "string",
  "core_concept": "EXACTLY ONE sentence stating the single main idea",
  "key_highlights": [
    "Specific insight — minimum 15 words, directly verifiable from transcript"
  ],
  "mental_models": [
    { "name": "string", "description": "string" }
  ],
  "examples_used": ["string"],
  "warnings_and_mistakes": ["string"],
  "key_terms": [
    { "term": "string", "definition": "string" }
  ],
  "estimated_difficulty": "beginner | intermediate | advanced",
  "topic_category": "string"
}

Quality rules:
- core_concept must be ONE sentence. If you need two, distill further.
- key_highlights must be specific. "People should manage time better" is wrong.
  "The speaker argues that batching similar tasks reduces context-switching
  cost by an estimated 40%" is correct.
- mental_models: include only if the video explicitly introduces a framework.
- warnings_and_mistakes: include only if the speaker explicitly calls
  something out as wrong or dangerous.
- Return only valid JSON. Nothing outside the JSON block.
```

---

## 4.4 Teacher Agent

```
You are the Teacher agent for LearnAgent.
You translate structured analysis into clear, memorable human language.
You write like the best teacher the reader ever had: precise, warm,
zero fluff. You use analogies generously. You never talk down.

Input: The structured JSON from the Analyst agent.

Your job: Transform the JSON into flowing, readable markdown that someone
could read in under 3 minutes and feel like they genuinely understand the video.

Output format (markdown):

## 🧠 What This Is Really About
[2-3 sentences. Vivid and concrete. Use an analogy if it helps.]

---

## 💡 The Key Things You Need to Know
**[Highlight title]**
[1-2 sentences in plain terms.]
[Repeat for all highlights.]

---

## 🔧 The Mental Model
[Only if a mental model was identified. Explain it as if teaching
a smart 16-year-old. Use a real-world analogy. Skip this section
if no mental model was found in the transcript.]

---

## 📌 Real Examples
[Only if examples were found. Describe them in plain terms. Skip if none.]

---

## ⚠️ Watch Out For
[Only if warnings were found in the transcript. Skip if none.]

---

## 🔑 Key Terms
**[Term]**: [Plain-language definition]

Writing rules:
- Write in second person ("you") throughout.
- Never say "the speaker says" or "in this video" — teach the idea directly.
- Every sentence must earn its place. If you can cut it without losing meaning, cut it.
```

---

## 4.5 Action Agent

```
You are the Action agent for LearnAgent.
You are an implementation coach who turns learning into doing.
Knowledge not applied is worthless. Your job is to make action unavoidable.

You receive three inputs:
1. The Teacher agent's plain-language summary (markdown)
2. The Analyst agent's structured JSON
3. project_context: a short description of what the user is currently building

CRITICAL: project_context is the lens for every task you generate.
A developer building a payment integration with Stripe gets completely
different tasks from a developer studying for system design interviews —
from the exact same video. If project_context is empty, produce a
reasonably specific plan but note that providing a project context
would make it more targeted.

Every action item you write must pass this test:
"Could this task have been written without knowing both the specific video
content AND the user's project context?"
If the answer is yes, the task is too generic. Rewrite it.

Output format (markdown):

## ⚡ Your Action Plan

*Tailored for: [project_context]*

### 🔴 Do Today
[3 specific, immediate actions. Low effort, creates momentum.
Each must reference both the video content and the project context.]

1. **[Action title]** — [Exact instruction. What to do, not "think about X".]
2. **[Action title]** — [Instruction]
3. **[Action title]** — [Instruction]

---

### 🟡 This Week
[3 milestones that move the user's project forward
using insights from this specific video.]

**Day 2–3:** [Specific milestone — what will exist that does not exist now?]
**Day 4–5:** [Next milestone]
**Day 6–7:** [Final milestone]

---

### 🟢 30-Day Challenge
[One specific project, habit, or experiment that:
a) requires understanding this specific video to complete, and
b) directly advances the user's stated project.
Make it measurable. "Build X feature using Y concept from this video"
— not "practice Y more".]

---

### 🛠️ Resources You'll Need
[Only what this specific project actually needs. No generic lists.
Be specific about tools, documentation, or skills required.]

---

### 📊 How to Know It's Working
[3 observable, measurable signs specific to the user's project context.]

1. [Measurable sign tied to the project]
2. [Measurable sign]
3. [Measurable sign]
```

---

---

# PART 5 — RUNNER SCRIPT

---

## 5.1 claude-code-runner.sh

For local pipeline testing outside the web application. After saving: `chmod +x claude-code-runner.sh`

```bash
#!/bin/bash
# LearnAgent — Local Pipeline Runner
# Usage: ./claude-code-runner.sh "https://youtube.com/watch?v=..." "What you are building"

YOUTUBE_URL="$1"
PROJECT_CONTEXT="${2:-No project context provided}"

if [ -z "$YOUTUBE_URL" ]; then
  echo "Error: No YouTube URL provided"
  echo "Usage: ./claude-code-runner.sh \"URL\" \"Project context\""
  exit 1
fi

echo "LearnAgent Pipeline Starting..."
echo "Video: $YOUTUBE_URL"
echo "Context: $PROJECT_CONTEXT"
echo "─────────────────────────────────"

claude --print \
  "You are running the LearnAgent pipeline. Process this video through
  all four agents in sequence using their prompts from MASTER-REFERENCE.md.

  YouTube URL: $YOUTUBE_URL
  Project Context: $PROJECT_CONTEXT

  Run agents in order: Fetcher → Analyst → Teacher → Action Agent.
  Pass project_context to the Action Agent only.
  Save the final report to output/[video-id]-report.md.
  Return the full report content."

echo "─────────────────────────────────"
echo "Done. Check output/ for your report."
```

---

---

# PART 6 — QUICK REFERENCE

---

## 6.1 Commands Cheat Sheet

```bash
# Start a Claude Code session
cd learnagent && claude
# First message every session:
# "Read MASTER-REFERENCE.md completely. State current phase from SPEC.md."

# Local pipeline test
./claude-code-runner.sh "https://youtube.com/watch?v=ID" "Building a SaaS with Next.js"

# Development server
npm run dev

# Supabase local development
npx supabase start
npx supabase db push

# Deploy to Vercel
vercel --prod

# Test transcript API
curl "https://api.supadata.ai/v1/youtube/transcript?videoId=dQw4w9WgXcQ&lang=en" \
  -H "x-api-key: $SUPADATA_API_KEY"

# Test full pipeline endpoint locally
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://youtube.com/watch?v=ID","project_context":"Building a SaaS app"}'
```

---

## 6.2 Debugging Guide

| Symptom | Cause | Fix |
|---------|-------|-----|
| Action plan is generic | project_context not reaching Action Agent | Verify Orchestrator passes it; confirm Action Agent prompt reads it |
| Fetcher returns 401 | API key missing or incorrect | Run `echo $SUPADATA_API_KEY` — re-set if empty |
| Fetcher returns empty transcript | Video has no captions | Test with a different video to confirm pipeline works |
| Analyst returns invalid JSON | Transcript too short or ambiguous | Add stricter instruction: "Return ONLY valid JSON, no markdown" |
| Tasks not persisting after refresh | Supabase RLS blocking the update | Confirm task update route uses service role key, not anon key |
| Share link shows 404 | Public route not configured | Verify app/share/[id]/page.tsx exists and the route is not behind auth middleware |
| Copy-as-Markdown fails silently | Clipboard API blocked | Check browser permissions; ensure the call is inside a user gesture handler |
| Weekly email not sending | Resend key missing or cron not configured | Check RESEND_API_KEY env var; verify the cron schedule in Vercel or Supabase Edge Functions |
| Streak-at-risk email fires incorrectly | Inactivity calculation wrong | Check that last_active_date in streaks table updates correctly on task completion |
| Streak calculation is wrong | Streak logic not running on report completion | Verify streak update runs in the report save handler, not separately |

---

---

# PART 7 — UX SPECIFICATION

---

## 7.1 User Profile and Context

The primary user is an active builder who uses YouTube as a professional input to real work. They are motivated, productivity-oriented, and expect a professional instrument — not a consumer toy. They pay for tools that eliminate execution friction. The interface must reflect the quality of the output it delivers.

---

## 7.2 The Project Context Feature

This is the primary product differentiator and must be treated as such in the UX. It is not a secondary form field — it is the feature that makes every output specific rather than generic.

On the Home screen, directly below the URL input, a text field asks: "What are you currently building?" The helper text reads: "Your action plan will be tailored to your project." The field accepts free text up to 200 characters, is optional but visually encouraged, and persists across sessions pre-filled with the user's last used context.

The project context must be visibly confirmed on Card 5 of the report with a small label reading "Tailored for: [project_context]" — this is the primary proof point of the product's value and must never be omitted.

---

## 7.3 The Four App States

**State 1 — Home/Input:** Single dominant action. URL input above the fold, project context field below it, Analyze button. Social proof beneath. No clutter.

**State 2 — Processing:** Four agents shown activating in sequence with a progress bar. Not a spinner. Each agent step is named and visible. Scan line animation on the card. Communicates intelligence, not waiting.

**State 3 — Report Reveal:** Five cards, one at a time. Sticky progress bar at the top. Each card occupies the full viewport. Card 5 shows the project context label, interactive task checkboxes, a "Copy as Markdown" button, a "Share Report" button, and the "Save and Track" CTA.

**State 4 — Library and Dashboard:** The retention layer. Where users return even when not generating new reports. Searchable archive and visible progress metrics.

---

## 7.4 Navigation Structure

Persistent left sidebar on desktop, collapsible to icon-only. Four destinations: Home (⚡, URL input), Library (📚, archive), Progress (📊, stats), Settings (⚙️, account, project context, notification preferences). On mobile (future phase): bottom tab bar with the same four destinations.

---

## 7.5 Report Navigation — Detailed Specification

**Card sequence:** Concept → Highlights → Mental Models → Examples and Warnings → Action Plan.

**Progress bar:** Sticky at the top. Five labeled dots. Completed sections fill in teal. Active section has a pulse glow. Clicking a completed dot navigates back to that section.

**Card layout constraints:** Full viewport. Section label at top. Content in the middle. Back/Next controls at the bottom. Cards do not scroll internally — content is sized to fit. This constraint enforces concise agent output.

**Card 5 (Action Plan) specifics:** "Tailored for: [project_context]" label at the top in small monospace text. Two-column task grid with TODAY (amber badge) and THIS WEEK (blue badge) columns. Checkbox click triggers immediate Supabase update with a micro-animation. 30-day challenge displayed as a highlighted box below the grid. Two action buttons in the footer: "Copy as Markdown" (copies the full action plan to clipboard) and "Share Report" (copies the public share link). "Save and Track" CTA replaces the Next button. "View Full Report" toggle expands everything as a single scrollable page.

---

## 7.6 Progress Dashboard

Displays: total videos analyzed (lifetime), task completion ratio, current streak (consecutive days with at least one completed task), 7-day activity bar chart, topic distribution donut chart, and difficulty breakdown. Charts use Recharts. Teal for active data, muted grey for inactive. Thin-line style — no heavy fills.

---

## 7.7 Authentication Flow

Centered modal overlay. Email/password and Google OAuth. No onboarding wizard. After login, user lands on Home. First-time users see a single dismissible banner: "Paste a YouTube URL, add what you're building, and get a tailored action plan in 90 seconds."

---

## 7.8 Browser Extension

Ships in v1.3. Detects the active YouTube tab. Popup shows the video URL pre-filled and the user's saved project context pre-filled. Single "Analyze" CTA opens the web app in a new tab with both values passed as query parameters.

---

## 7.9 Share and Export

**Shareable report links** ship in the MVP. Every completed report has a public URL at `/share/[reportId]` that renders the full report — concept, highlights, models, examples, and action plan — without requiring login. The public view is read-only but visually identical to the authenticated report view, including the "Tailored for" label and the formatted action plan. A small LearnAgent callout at the bottom reads "Generate your own free report at learnagent.io" — every shared link is a passive acquisition channel. On Card 5, a "Share Report" button copies the public URL to the clipboard with a brief "Link copied!" confirmation.

**Copy-as-Markdown** is a single button on Card 5. It copies the full action plan — the three today tasks, three weekly milestones, the 30-day challenge, resources, and metrics — as clean, portable Markdown to the clipboard. No API keys, no configuration, no integration to maintain. The Markdown is compatible with any tool that accepts it: Notion, Obsidian, Linear, GitHub, Bear, or a plain text file. A "Copied!" confirmation appears for 2 seconds after clicking.

**Why not a Notion integration:** A Notion integration requires each user to obtain an API key, configure it in Settings, and maintain it when the Notion API changes. It adds a support burden, creates a fragile dependency, and exports the action plan out of LearnAgent — removing all the contextual value (streak tracking, task completion, library history) the moment the content leaves. Copy-as-Markdown achieves the same portability goal in one click with zero infrastructure. A proper Notion integration can be added in v2.0 if user demand justifies it.

---

## 7.10 Visual Design System

| Element | Specification |
|---------|--------------|
| Background | `#060810` |
| Card surface | `#0C0F1A` elevated to `#111624` |
| Primary accent | Teal `#0FFFC4` |
| Secondary accent | Amber `#FFB830` for task badges and streaks |
| Display font | Instrument Serif — headlines, quotes, large display numbers |
| UI font | Outfit — navigation, buttons, body text |
| Data font | JetBrains Mono — labels, status text, inputs, code |
| Border radius | 14px on cards, 9px on buttons and inputs |
| Accent glow | `rgba(15,255,196,0.14)` on focus and active states |
| Task complete animation | Teal checkmark draws itself, 300ms ease |

---

## 7.11 MVP Screen Inventory

The MVP comprises 12 screens. All must ship together.

Login and sign-up (2 screens). Home with URL input and project context field. Processing screen with agent pipeline progress. Report Cards 1–4 (Concept, Highlights, Models, Examples). Report Card 5 — Action Plan with project context label, tasks, "Copy as Markdown" button, "Share Report" button, and Save and Track CTA. Full Report view as a single-scroll expansion. Library with search and filters. Progress dashboard with stats and charts. Settings with account management, current project context, and notification preferences.

---

## 7.12 UX Rules for Development

These are non-negotiable constraints enforced during every build session.

Every screen transition is animated (minimum: fade plus translateY). The processing screen always shows individual agent steps — never a generic spinner. Report cards never scroll internally at 1440px viewport width. Task completion persists across sessions without exception. Library search filters in real time with no submit button. The "Tailored for" label is always visible on Card 5 when a project context was provided. The "Copy as Markdown" and "Share Report" buttons are always present on Card 5. The "Copied!" and "Link copied!" confirmations display for exactly 2 seconds after clicking. The public share view at `/share/[id]` must render correctly without an authenticated session. No internal methodology terminology is visible anywhere in the UI. The layout must not break below 1024px viewport width.

---

---

# PART 8 — CLAUDE CODE BUILD GUIDE

---

## 8.1 What Claude Code Is and Why You Use It

Claude Code is a command-line tool that gives Claude direct access to your file system and terminal. It writes files, runs commands, installs packages, and tests output autonomously inside your actual project folder. For LearnAgent, Claude Code will create every agent file, build all Next.js screens, wire up Supabase, and run full pipeline tests without you switching context between a chat window and your editor.

The critical advantage is that Claude Code reads `CLAUDE.md` automatically at the start of every session. It therefore knows the full spec, every agent contract, the project_context rules, and all UX constraints before writing a single line. This document is that spec.

---

## 8.2 Prerequisites

Required before starting: Node.js v20+ (`node --version`), Claude Code (`npm install -g @anthropic-ai/claude-code`), Git (`git --version`), a Supabase account and project created at supabase.com, a Supadata API key from supadata.ai, and an Anthropic API key with billing enabled at console.anthropic.com.

Authenticate Claude Code once before starting: `claude login`

---

## 8.3 Project Initialization

```bash
# Create the Next.js project
npx create-next-app@latest learnagent --typescript --tailwind --app --no-src-dir
cd learnagent

# Install required packages
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @anthropic-ai/sdk recharts resend

# Copy MASTER-REFERENCE.md into the project root
# Create CLAUDE.md and SPEC.md from Part 3 of this document

git init && git add . && git commit -m "init: scaffold and spec"

# Open Claude Code
claude
```

**First message in every Claude Code session:**
```
Read MASTER-REFERENCE.md completely before doing anything.
State the current build phase from SPEC.md and confirm every agent contract
including the project_context rule before proceeding.
```

---

## 8.4 Full Build Sequence

Send each prompt from Section 2.7 to Claude Code one phase at a time. Wait for the phase exit condition to be met and for SPEC.md to be updated before sending the next prompt.

| Phase | Prompt source | Exit condition |
|-------|---------------|----------------|
| 0 — Setup | Section 2.7 Phase 0 | Claude Code states all contracts accurately |
| 1 — Database | Section 2.7 Phase 1 | Tables live in Supabase with RLS active |
| 2 — Auth | Section 2.7 Phase 2 | Login and signup work end-to-end |
| 3 — Pipeline | Section 2.7 Phase 3 | Real URL and context produce report in under 90 seconds |
| 4 — Home | Section 2.7 Phase 4 | URL and context submitted, navigation works |
| 5 — Processing | Section 2.7 Phase 5 | Real-time agent progress visible, auto-navigation works |
| 6 — Report Cards | Section 2.7 Phase 6 | All 5 cards render, context label visible, tasks persist |
| 7 — Share, Export & Notifications | Section 2.7 Phase 7 | Share link works, copy-as-Markdown works, test email sends |
| 8 — Library | Section 2.7 Phase 8 | Search filters in real time, skeleton loading present |
| 9 — Dashboard | Section 2.7 Phase 9 | All stats render with real Supabase data |
| 10 — Polish | Section 2.7 Phase 10 | Full end-to-end pass, all UX rules verified |

---

## 8.5 Environment Variables

Create `.env.local` in the project root before Phase 3. Add it to `.gitignore` before committing.

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
SUPADATA_API_KEY=your_supadata_api_key
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 8.6 Session Rules

Every Claude Code session starts by reading this document and SPEC.md. Every session ends by updating the phase status in SPEC.md. Claude Code never modifies MASTER-REFERENCE.md during a build session. If Claude Code encounters a conflict between a user request and the spec, it flags the conflict before implementing anything. When giving corrections to Claude Code, describe the specific component, the specific behavior, and the specific rule from the spec being violated. Vague feedback produces vague fixes.

---

---

# PART 9 — BUSINESS CASE

---

## 9.1 The Problem

The implementation gap — the distance between understanding something and doing something with it — is the most underserved moment in self-directed learning. People consume enormous volumes of educational video content and translate almost none of it into capability. The cause is not poor recall of facts. It is the absence of any connection between what was watched and what is actively being built.

Every existing tool in the adjacent space solves the wrong problem. Summarizers compress content. Note-takers capture it. Neither asks: given what you are working on right now, what should you do with what you just learned? That question is the entire product.

---

## 9.2 Target Audience

The **primary audience** is active builders — developers, indie hackers, and technical product people who use YouTube as a professional learning input. They already pay $15–30 per month for tools that eliminate execution friction. They have the clearest and most immediate ROI for a tool that connects video learning to active projects.

The **secondary audience** is course creators and indie educators building YouTube channels, newsletters, or courses. They need structured notes, competitive intelligence, and a way to translate consumed content into material they create. Higher willingness to pay and a clearer B2B-adjacent value proposition.

The **tertiary audience** is ambitious career changers investing in skill development — the Udemy and Coursera cohort, frustrated by the gap between finishing a course and building something real.

---

## 9.3 Monetization Model

The free tier offers 5 reports per month with full access to the library, task tracking, streaks, shareable links, and copy-as-Markdown on existing reports. This demonstrates the full product value without enabling unlimited use for anyone in the target audience.

The individual plan at $14 per month or $120 per year provides unlimited reports, browser extension access (from v1.3), and priority processing. Shareable links and copy-as-Markdown are available on all tiers — they are not paywalled because every shared link is a distribution event.

The creator plan at $34 per month or $280 per year adds shared libraries, bulk export, and a competitive intelligence mode for analyzing multiple videos from the same creator or topic.

Annual pricing at 15–20% off improves cash flow predictability. This pricing sits below the cost of a single Udemy course, which is the implicit comparison in the target user's mind.

---

## 9.4 Defensibility

Three layers of defensibility apply, ordered by durability. In the short term, the prompt engineering and agent architecture quality are not easy to replicate with a basic AI integration — the specificity of the context-aware action plan requires the careful contract design documented in this spec. In the medium term, the library and task history create switching costs — once a user has accumulated reports, a streak, and completion history, they have built something that exists nowhere else. In the long term, the browser extension creates passive distribution that competitors cannot replicate without already having the extension installed.

---

## 9.5 Go-to-Market

The strongest launch asset is a 60-second demo video showing the full pipeline in real time: URL and project context submitted, four agents firing in visible sequence, and the action plan appearing with project-specific tasks. This is shareable because the visual of agents working in transparent steps is still novel enough to generate attention.

Primary channels: X/Twitter builder and developer communities, Indie Hackers, Product Hunt, and YouTube channels covering AI tools and developer productivity. The build journey itself — from spec to working product — is content that attracts exactly the audience that would pay for the tool.

---

## 9.6 Risks

**Commodity risk.** Anthropic, Google, and OpenAI have incentives to add video learning features natively. The defense is the library, tracking, and project-context features — those require a dedicated product with persistent state, not a chat feature that forgets the session.

**Transcript availability.** Videos without captions fail. Non-English videos reduce output quality. This limits addressable content and creates frustration at the highest-intent moments. Graceful error handling with clear user-facing messages is non-negotiable before public launch.

**Differentiation proof at first use.** The product must produce a visibly better action plan than pasting a transcript into a general-purpose AI tool with a generic prompt. If the difference is not obvious within the first report, the user will not return. The project_context feature is the primary mechanism for proving that difference on the first use.

---

## 9.7 Verdict

This is worth building as a product to sell. The implementation gap is a real problem experienced by a large and growing audience. The combination of context-aware action planning, persistent task tracking, and a growing personal knowledge library creates something meaningfully different from every summarization tool on the market.

The clearest signal of product-market fit is simple: does the user open the app the next time they watch a YouTube video they want to learn from? If they do, the habit is forming and the product has value. Build toward that moment. Everything in this document — the agent architecture, the project context feature, the library, the streak tracker, the shareable links, the retention emails — exists to make that return visit feel natural and worth the subscription.

---

*This is the single source of truth for LearnAgent.*
*All changes to strategy, architecture, UX, or agent behavior must be reflected here before being implemented in code.*
