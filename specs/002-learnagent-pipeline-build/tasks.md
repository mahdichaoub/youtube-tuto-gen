# Tasks: LearnAgent — Pipeline Build on Existing Boilerplate

**Input**: Design documents from `/specs/002-learnagent-pipeline-build/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: No automated tests — manual end-to-end validation per phase exit condition (research decision §9).

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths included in every description

---

## Phase 1: Setup (Environment & SDK Clients)

**Purpose**: Install missing packages and create the two external-service client singletons before any agent or API route can be built.

- [ ] T001 Add `@anthropic-ai/sdk` and `recharts` to dependencies via `pnpm add @anthropic-ai/sdk recharts` and verify both appear in `package.json`
- [ ] T002 Add `ANTHROPIC_API_KEY`, `SUPADATA_API_KEY`, and `RAPIDAPI_KEY` entries (with placeholder values) to `env.example`
- [ ] T003 [P] Create `src/lib/anthropic/client.ts` — export a singleton `Anthropic` instance from `@anthropic-ai/sdk` initialized with `process.env.ANTHROPIC_API_KEY`; model constant `MODEL = "claude-sonnet-4-6"` exported alongside
- [ ] T004 [P] Create `src/lib/supadata/client.ts` — export `fetchTranscript(videoId: string)` that calls `GET https://api.supadata.ai/v1/youtube/transcript?videoId={videoId}&lang=en` with `x-api-key: SUPADATA_API_KEY`; on 404 or 429 retries once with RapidAPI YouTube Transcript endpoint using `RAPIDAPI_KEY`; throws `{ code: "transcript_unavailable" }` if both fail

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story can be implemented. Database schema, URL validation utility, and the in-process SSE event emitter bridge.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Create `src/lib/validate-url.ts` — export `extractVideoId(url: string): string | null` that parses all YouTube URL formats (`youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`, `youtube.com/shorts/`) and returns the 11-char video ID matching `^[a-zA-Z0-9_-]{11}$`, or `null` for invalid/private URLs
- [ ] T006 Create `src/lib/pipeline-emitter.ts` — export a module-level `Map<string, EventEmitter>` keyed by `reportId`; export `getEmitter(reportId)` (creates if absent), `removeEmitter(reportId)`, and the SSE event type `PipelineEvent = { stage: string; status: "running" | "complete"; progress: number } | { type: "done"; report_id: string } | { type: "error"; message: string }`
- [ ] T007 Extend `src/lib/schema.ts` — add `reports` table: `id` (uuid PK defaultRandom), `userId` (text, FK→user.id cascade delete, NOT NULL), `videoId` (text NOT NULL), `videoUrl` (text NOT NULL), `title` (text nullable), `topicCategory` (text nullable), `estimatedDifficulty` (text nullable), `projectContext` (text NOT NULL), `status` (text NOT NULL default `'fetching'`), `isShared` (boolean NOT NULL default false), `createdAt` (timestamp defaultNow NOT NULL), `updatedAt` (timestamp defaultNow NOT NULL); add indexes `reports_user_id_idx` and `reports_created_at_idx`
- [ ] T008 Extend `src/lib/schema.ts` — add `reportSections` table: `id` (uuid PK defaultRandom), `reportId` (uuid, FK→reports.id cascade delete, NOT NULL), `sectionType` (text NOT NULL — values: `concept | highlights | models | examples | actions`), `contentJson` (jsonb NOT NULL), `createdAt` (timestamp defaultNow NOT NULL); add index `report_sections_report_id_idx`
- [ ] T009 Extend `src/lib/schema.ts` — add `tasks` table: `id` (uuid PK defaultRandom), `reportId` (uuid, FK→reports.id cascade delete, NOT NULL), `userId` (text, FK→user.id cascade delete, NOT NULL), `label` (text NOT NULL), `scope` (text NOT NULL — values: `today | week | month`), `completed` (boolean NOT NULL default false), `completedAt` (timestamp nullable), `createdAt` (timestamp defaultNow NOT NULL); add indexes `tasks_user_id_idx`, `tasks_report_id_idx`, `tasks_completed_at_idx`
- [ ] T010 Extend `src/lib/schema.ts` — add `streaks` table: `id` (uuid PK defaultRandom), `userId` (text UNIQUE, FK→user.id cascade delete, NOT NULL), `currentStreak` (integer NOT NULL default 0), `longestStreak` (integer NOT NULL default 0), `lastActiveDate` (date nullable), `updatedAt` (timestamp defaultNow NOT NULL)
- [ ] T011 Run `pnpm run db:push` to apply the 4 new tables to local PostgreSQL; open Drizzle Studio at `http://localhost:4983` and confirm `reports`, `report_sections`, `tasks`, `streaks` tables all exist with correct columns; insert a test row into `reports` and verify it persists

**Checkpoint**: Database schema complete — user story implementation can now begin.

---

## Phase 3: User Story 1 — Submit a YouTube Video and Receive a Project-Specific Action Plan (Priority: P1) 🎯 MVP

**Goal**: Full pipeline from URL submission → agent processing → SSE progress → tabbed report with project-specific action plan.

**Independent Test**: POST to `/api/analyze` with a real YouTube URL and project description; subscribe to the SSE stream; verify a complete 5-section report is returned in under 90 seconds with action plan tasks that explicitly reference both the video content and the project description.

### Agent Pipeline

- [ ] T012 [P] [US1] Create `src/agents/fetcher.ts` — export `runFetcher(videoUrl: string): Promise<FetcherOutput>` where `FetcherOutput = { video_id, video_url, title, transcript_length, language, is_partial, transcript }`; call `src/lib/supadata/client.ts fetchTranscript(videoId)` with the video ID extracted via `extractVideoId`; throw `{ code: "transcript_unavailable" }` if client fails
- [ ] T013 [P] [US1] Create `src/agents/analyst.ts` — export `runAnalyst(fetcherOutput: FetcherOutput): Promise<AnalystOutput>` where `AnalystOutput = { video_id, core_concept (one sentence), key_highlights (5–7 strings), mental_models, examples_used, warnings_and_mistakes, key_terms, estimated_difficulty ("beginner"|"intermediate"|"advanced"), topic_category }`; call `claude-sonnet-4-6` via `src/lib/anthropic/client.ts` with a structured system prompt that demands all fields; parse and validate JSON response; throw on contract violation
- [ ] T014 [P] [US1] Create `src/agents/teacher.ts` — export `runTeacher(fetcherOutput: FetcherOutput, analystOutput: AnalystOutput): Promise<string>`; call `claude-sonnet-4-6` instructed to produce markdown containing exactly the sections `## 🧠 What This Is Really About` and `## 💡 The Key Things You Need to Know`; validate both headings are present; throw if missing
- [ ] T015 [US1] Create `src/agents/action.ts` — export `runAction(teacherMd: string, analystOutput: AnalystOutput, projectContext: string): Promise<ActionOutput>` where `ActionOutput = { markdown: string, today: string[3], week: string[3], challenge: string, resources: string[], metrics: string[3] }`; call `claude-sonnet-4-6` with system prompt that receives `projectContext` and is explicitly instructed that every task must be impossible to write without knowing both the video content AND the user's specific project — generic tasks are contract violations; parse structured JSON; validate array lengths exactly (today=3, week=3, metrics=3, challenge=1 string); throw on violation; `project_context` is passed ONLY to this agent
- [ ] T016 [US1] Create `src/agents/orchestrator.ts` — export `runPipeline(reportId: string, videoUrl: string, projectContext: string, userId: string): Promise<void>`; sequential execution: (1) emit `{stage:"fetching",status:"running",progress:0}` → call `runFetcher` → update `reports.status="analyzing"` → emit `{stage:"fetching",status:"complete",progress:20}`; (2) emit `{stage:"analyzing",status:"running",progress:20}` → call `runAnalyst` → update `reports.status="teaching"` → emit `{stage:"analyzing",status:"complete",progress:40}`; (3) emit `{stage:"teaching",status:"running",progress:40}` → call `runTeacher` → update `reports.status="planning"` → emit `{stage:"teaching",status:"complete",progress:60}`; (4) emit `{stage:"planning",status:"running",progress:60}` → call `runAction` → emit `{stage:"planning",status:"complete",progress:80}`; (5) emit `{stage:"saving",status:"running",progress:80}` → save 5 rows to `reportSections` (sectionType: concept/highlights/models/examples/actions) → save tasks rows (today items→scope:"today", week items→scope:"week", challenge→scope:"month") → update `reports.status="complete"`, `title`, `topicCategory`, `estimatedDifficulty`, `updatedAt` → emit `{stage:"saving",status:"complete",progress:100}` → emit `{type:"done",report_id:reportId}` → call `removeEmitter(reportId)`; on any unrecoverable error: update `reports.status="failed"` → emit `{type:"error",message:"We couldn't process this video. Please try again."}` → call `removeEmitter(reportId)`; all Drizzle queries include `.where(eq(reports.userId, userId))`

### API Endpoints

- [ ] T017 [US1] Create `src/app/api/analyze/route.ts` — POST handler: (1) authenticate via `src/lib/session.ts` — return 401 if no session; (2) parse body, call `extractVideoId(url)` — return 400 `{error:"invalid_url",message:"Please provide a valid YouTube video URL."}` if null; (3) validate `project_context.trim().length >= 10` — return 400 `{error:"missing_context",message:"Please describe what you are currently building."}` if not; (4) query `reports` WHERE `userId=session.user.id` AND `status IN ('fetching','analyzing','teaching','planning')` — return 409 `{error:"generation_active",message:"A report is already being generated. Please wait for it to complete."}` if found; (5) insert new `reports` row with `status="fetching"`; (6) call `runPipeline(reportId, url, project_context, userId)` with no await (fire-and-forget, wrapped in `.catch` to prevent unhandled rejection); (7) return 202 `{report_id, status:"fetching"}`
- [ ] T018 [US1] Create `src/app/api/analyze/[id]/stream/route.ts` — GET handler: authenticate; verify the report exists and `reports.userId = session.user.id` — return 404 if not found/not owned; if `reports.status = "complete"` immediately return `data: {"type":"done","report_id":"<id>"}\n\n`; otherwise subscribe to `getEmitter(id)` and return a `ReadableStream` with `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`; format each `PipelineEvent` as `data: <json>\n\n`; close stream on `done` or `error` events; handle client disconnect via `signal.addEventListener("abort", ...)`
- [ ] T019 [US1] Create `src/app/api/reports/[id]/route.ts` — GET handler: authenticate; query `reports` WHERE `id=param` AND `userId=session.user.id` — return 404 `{error:"not_found"}` if missing, 403 `{error:"forbidden"}` if owned by someone else; join `reportSections` (all rows for this reportId) and `tasks` (all rows WHERE `reportId=param` AND `userId=session.user.id`); assemble `sections` object keyed by `sectionType`; return full report object per `contracts/api-reports.md` GET `/api/reports/[id]` response contract

### UI Components

- [ ] T020 [P] [US1] Create `src/components/report/ConceptTab.tsx` — accepts `concept: { core_concept: string; explanation: string }`; renders a shadcn `Card` with the concept as a large heading and explanation as body text
- [ ] T021 [P] [US1] Create `src/components/report/HighlightsTab.tsx` — accepts `highlights: { items: string[] }`; renders a shadcn `Card` with a numbered list of highlight items (5–7)
- [ ] T022 [P] [US1] Create `src/components/report/ModelsTab.tsx` — accepts `models: { items: Array<{ name: string; description: string }> }`; renders a shadcn `Card` with each model as a bold name + description paragraph
- [ ] T023 [P] [US1] Create `src/components/report/ExamplesTab.tsx` — accepts `examples: { items: string[] }`; renders a shadcn `Card` with a bulleted list of real examples from the video
- [ ] T024 [P] [US1] Create `src/components/report/ActionPlanTab.tsx` — accepts `actions: ActionOutput` and `tasks: TaskItem[]`; renders four sections: "Do Today" (3 items), "This Week" (3 items), "30-Day Challenge" (1 item), "Resources", "How to Know It's Working" (3 metrics); renders task items with `label` text only and a placeholder `checked` prop (wired in US2); renders project context label above the plan

### UI Screens

- [ ] T025 [US1] Create `src/app/(app)/home/page.tsx` — client component: YouTube URL input + project context textarea (≥10 chars, validated on submit); on submit calls `POST /api/analyze`, navigates to `/process/[report_id]` on 202; on 409 displays friendly "already generating" message and disables form; if user has existing complete reports, renders 3–5 most recent as summary cards (title, topicCategory, createdAt) fetched from `GET /api/reports?limit=5`; all error messages use user-friendly text (no internal terms)
- [ ] T026 [US1] Create `src/app/(app)/process/[id]/page.tsx` — client component: connects to `GET /api/analyze/[id]/stream` via `EventSource`; renders 5 progress steps using the UI label map from `src/lib/sse-labels.ts` (created in Polish phase — inline the map here for now): fetching→"Reading the video", analyzing→"Analyzing the content", teaching→"Writing your summary", planning→"Crafting your action plan", saving→"Saving your report"; animates the current active step; on `{type:"done"}` event auto-navigates to `/report/[report_id]`; on `{type:"error"}` shows friendly error message with retry button linking back to `/home`; on mount reconnects to in-progress stream if already running (SSE handles this natively)
- [ ] T027 [US1] Create `src/app/(app)/report/[id]/page.tsx` — server component: fetches `/api/reports/[id]`; renders shadcn `Tabs` with 5 tabs in order: "Action Plan" (default active, pinned first), "Core Concept", "Key Highlights", "Mental Models", "Real Examples"; passes section data to `ActionPlanTab`, `ConceptTab`, `HighlightsTab`, `ModelsTab`, `ExamplesTab`; renders video title and topic category in page header; no internal terms in any visible text

**Checkpoint**: Full pipeline and report display functional — submit a real URL and verify all 5 tabs render with contract-valid content.

---

## Phase 4: User Story 2 — Mark Tasks Complete and Maintain a Learning Streak (Priority: P2)

**Goal**: Task completion persists across sessions; streak counter updates in real time in the header on every authenticated page.

**Independent Test**: Check off a task on any report, reload the page, sign out, sign back in — task remains checked. Streak counter in header reflects the change in real time without page reload.

- [ ] T028 [US2] Create `src/app/api/tasks/[id]/route.ts` — PATCH handler: authenticate; query `tasks` WHERE `id=param` AND `userId=session.user.id` — return 404 if not found, 403 if owned by another user; update `completed` to requested value; if `completed=true` set `completedAt=now()`, if `completed=false` set `completedAt=null`; upsert `streaks` row for user using streak algorithm: if `lastActiveDate=today` no change, if `lastActiveDate=yesterday` increment `currentStreak`, if `lastActiveDate<yesterday` reset `currentStreak=1`; update `longestStreak` if `currentStreak>longestStreak`; update `streaks.updatedAt`; return `{ id, completed, completedAt, streak: { currentStreak, longestStreak, lastActiveDate } }` per `contracts/api-tasks.md`
- [ ] T029 [US2] Create `src/app/api/streak/route.ts` — GET handler: authenticate; query `streaks` WHERE `userId=session.user.id`; if no row exists return `{ currentStreak: 0, longestStreak: 0, lastActiveDate: null }`; otherwise return the streak row per `contracts/api-share.md` GET `/api/streak` contract
- [ ] T030 [US2] Update `src/components/report/ActionPlanTab.tsx` — add `onTaskToggle?: (taskId: string, newStreak: { currentStreak: number }) => void` prop; wire each task item checkbox to call `PATCH /api/tasks/[id]` with `{ completed: !current }`; on success apply immediate visual style (strikethrough + `text-muted-foreground` on completed tasks); call `onTaskToggle` with the returned streak value so the parent can propagate to the header
- [ ] T031 [US2] Update `src/app/(app)/report/[id]/page.tsx` — make it a client component (or add a client wrapper); add `streakCount` state initialized from `/api/streak`; pass `onTaskToggle` handler to `ActionPlanTab` that updates `streakCount` state; pass `streakCount` up to the layout via a React context defined in the next task
- [ ] T032 [US2] Create `src/contexts/StreakContext.tsx` — React context + provider with `currentStreak` and `setCurrentStreak`; wrap `src/app/(app)/layout.tsx` with the provider; add a streak display (e.g. "🔥 N") to the layout's header/nav that reads from `StreakContext` and fetches initial value from `GET /api/streak` on mount; update context value from `onTaskToggle` callbacks

**Checkpoint**: Task completion persists across sessions; streak counter visible in header on every authenticated page; updates in real time on task toggle.

---

## Phase 5: User Story 3 — Share a Report and Export the Action Plan (Priority: P3)

**Goal**: Public share link renders the full report for unauthenticated visitors; action plan copies as valid Markdown.

**Independent Test**: Toggle share on, open `/share/[id]` in a private window with no session — full report renders. Toggle share off — link returns 404. "Copy as Markdown" pastes valid structured Markdown.

- [ ] T033 [P] [US3] Create `src/app/api/reports/[id]/share/route.ts` — POST handler: authenticate; query `reports` WHERE `id=param` AND `userId=session.user.id` — return 404 if not found; update `isShared` to requested boolean; return `{ id, isShared }` per `contracts/api-reports.md` POST `/api/reports/[id]/share` contract
- [ ] T034 [P] [US3] Create `src/app/share/[id]/page.tsx` — server component (no auth): query `reports` WHERE `id=param` AND `isShared=true` using a service-level Drizzle query (no userId filter — this is the one permitted bypass per data-model.md); if not found or not shared return `notFound()` (Next.js 404); join `reportSections`; render all 5 sections read-only (no task checkboxes, no share toggle, no userId exposed); add Open Graph meta tags for title and description; exclude any internal terms from visible text
- [ ] T035 [US3] Update `src/app/(app)/report/[id]/page.tsx` — add Share button that calls `POST /api/reports/[id]/share {isShared:true}` then copies `${window.location.origin}/share/${id}` to clipboard and shows a toast confirmation; add a "Disable sharing" button shown when `isShared=true` that calls the same endpoint with `{isShared:false}`; add "Copy as Markdown" button in the Action Plan tab area that copies `actions.markdown` to clipboard and shows a toast

**Checkpoint**: Share link works for unauthenticated visitors; 404 when disabled; Markdown copy produces valid output.

---

## Phase 6: User Story 4 — Browse and Search Past Reports (Priority: P4)

**Goal**: Searchable library of all completed reports, most recent first, with client-side filtered results and correct empty state.

**Independent Test**: Generate two reports with different topics; navigate to `/library`; both appear. Type a term matching only one — filter works without page reload. Empty state renders for new user.

- [ ] T036 [P] [US4] Create `src/app/api/reports/route.ts` — GET handler: authenticate; accept query params `page` (default 1), `limit` (default 20, max 50), `q` (search term); query `reports` WHERE `userId=session.user.id` AND `status="complete"` AND (if `q` present) `title ILIKE %q%` OR `topicCategory ILIKE %q%`; order by `createdAt DESC`; return `{ reports: [...], total, page, limit }` per `contracts/api-reports.md` GET `/api/reports` contract
- [ ] T037 [P] [US4] Create `src/components/library/ReportCard.tsx` — accepts report object; renders a shadcn `Card` with title, `topicCategory` as a badge, `estimatedDifficulty` badge, formatted `createdAt` date; entire card is a link to `/report/[id]`
- [ ] T038 [US4] Create `src/app/(app)/library/page.tsx` — client component: search input that debounces 300ms and calls `GET /api/reports?q=<term>`; renders a list of `ReportCard` components; when `reports.length === 0` and search is empty: renders empty state card with friendly message and a `Link` to `/home`; when `reports.length === 0` and search has a term: renders "No reports match your search" message

**Checkpoint**: Searchable library works with real data; empty state renders correctly for new accounts.

---

## Phase 7: User Story 5 — View a Progress Dashboard with Real Data (Priority: P5)

**Goal**: Dashboard showing current streak, total reports, total tasks completed, and 30-day activity chart — all populated with real data, no placeholder zeros.

**Independent Test**: After generating at least one report and completing at least one task, visit `/progress` and verify all four metrics display real data with no empty states or stub values.

- [ ] T039 [P] [US5] Create `src/components/dashboard/StatsCards.tsx` — accepts `{ streak, totalReports, totalTasksCompleted }`; renders three shadcn `Card` metric tiles; if all metrics are zero and user has no reports, renders an empty state CTA card instead of zero values
- [ ] T040 [P] [US5] Create `src/components/dashboard/ActivityChart.tsx` — accepts `data: Array<{ date: string; tasksCompleted: number }>` (30-day array); renders a Recharts `BarChart` with date on X-axis and count on Y-axis; if all values are zero renders an empty state card with CTA to `/home`
- [ ] T041 [US5] Create `src/app/(app)/progress/page.tsx` — server component: query `streaks` for current user; count `reports` WHERE `userId=session.user.id` AND `status="complete"`; count `tasks` WHERE `userId=session.user.id` AND `completed=true`; query `tasks` WHERE `userId=session.user.id` AND `completedAt >= now()-30days` grouped by UTC date for chart data; render `StatsCards` + `ActivityChart`; if user has zero reports and zero completed tasks render a single full-page empty state with CTA to `/home`

**Checkpoint**: All four dashboard metrics accurate; chart renders with real data; empty state shows for new users.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Shared constants, persistent generation indicator, terminology audit, final end-to-end validation.

- [ ] T042 Create `src/lib/sse-labels.ts` — export `const STAGE_LABELS: Record<string, string> = { fetching: "Reading the video", analyzing: "Analyzing the content", teaching: "Writing your summary", planning: "Crafting your action plan", saving: "Saving your report" }` and `const STAGE_ORDER = ["fetching","analyzing","teaching","planning","saving"]`; update `src/app/(app)/process/[id]/page.tsx` to import and use these constants instead of inline strings
- [ ] T043 [P] Create `src/components/GenerationBanner.tsx` — client component: reads active generation state from a `GenerationContext` (set when `POST /api/analyze` returns 202, cleared when SSE stream emits `done`/`error`); when active renders a subtle persistent top banner reading "Generating your report..." with a spinner; add `GenerationContext` provider to `src/app/(app)/layout.tsx`; store active `reportId` in `sessionStorage` so the banner persists across soft navigations
- [ ] T044 Audit all visible UI strings across `src/app/(app)/`, `src/app/share/`, and `src/components/` — search for internal terms (`fetching`, `analyzing`, `teaching`, `planning`, `orchestrator`, `fetcher`, `analyst`, `teacher`, `action agent`, `pipeline`) in any string that renders to the DOM; replace each found instance with the corresponding user-friendly label from `STAGE_LABELS` or a plain-language equivalent
- [ ] T045 Run the full `quickstart.md` end-to-end checklist: `pnpm run db:push`, `pnpm run dev`, execute Phase 3 curl commands to verify pipeline completes in <90s, then manually run Phases 4–10 browser checks and confirm all exit conditions are met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 completion — no other story dependencies
- **Phase 4 (US2)**: Depends on Phase 3 (needs tasks to exist in DB, ActionPlanTab to update)
- **Phase 5 (US3)**: Depends on Phase 3 (needs a complete report to share)
- **Phase 6 (US4)**: Depends on Phase 3 (needs complete reports to list)
- **Phase 7 (US5)**: Depends on Phase 3 + Phase 4 (needs reports and completed tasks)
- **Phase 8 (Polish)**: Depends on all stories being complete

### Within Each Phase

- Agent tasks T012–T014 can be built in parallel (different files, no deps)
- T015 (action.ts) depends on T013+T014 being complete (uses their output types)
- T016 (orchestrator.ts) depends on T012–T015 all being complete
- T017–T019 (API routes) depend on T016 (orchestrator)
- T020–T024 (UI components) can be built in parallel while API routes are being built
- T025–T027 (screens) depend on their respective API routes and components

### Parallel Opportunities

Within Phase 3 — can run in parallel after T016 is complete:
- API routes (T017, T018, T019)
- Report tab components (T020, T021, T022, T023, T024)

Within Phase 4: T028 and T029 can be built in parallel.

Within Phase 5: T033 and T034 can be built in parallel.

Within Phase 6: T036 and T037 can be built in parallel.

Within Phase 7: T039 and T040 can be built in parallel.

---

## Parallel Example: Phase 3 Agent Pipeline

```
# After T005–T011 (Foundational) are complete, start Phase 3:

# Run in parallel — independent files, no shared state:
Task T012: src/agents/fetcher.ts
Task T013: src/agents/analyst.ts
Task T014: src/agents/teacher.ts

# Then sequentially:
Task T015: src/agents/action.ts  (uses AnalystOutput from T013, teacherMd from T014)
Task T016: src/agents/orchestrator.ts  (uses all agents T012–T015)

# After T016, run in parallel:
Task T017: src/app/api/analyze/route.ts
Task T018: src/app/api/analyze/[id]/stream/route.ts
Task T019: src/app/api/reports/[id]/route.ts
Task T020: src/components/report/ConceptTab.tsx
Task T021: src/components/report/HighlightsTab.tsx
Task T022: src/components/report/ModelsTab.tsx
Task T023: src/components/report/ExamplesTab.tsx
Task T024: src/components/report/ActionPlanTab.tsx

# Then sequentially (screens depend on routes + components):
Task T025: src/app/(app)/home/page.tsx
Task T026: src/app/(app)/process/[id]/page.tsx
Task T027: src/app/(app)/report/[id]/page.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T011) — CRITICAL blocker
3. Complete Phase 3: User Story 1 (T012–T027)
4. **STOP and VALIDATE**: Run quickstart.md Phase 3 + 4 + 5 + 6 curl and browser checks
5. Deploy to Vercel for early feedback

### Incremental Delivery

1. Setup + Foundational → schema and clients ready
2. US1 complete → Full pipeline works end-to-end (MVP!)
3. US2 complete → Task completion + streak live
4. US3 complete → Sharing + Markdown export
5. US4 complete → Searchable library
6. US5 complete → Progress dashboard
7. Polish → Production-ready

---

## Notes

- **No automated tests** — manual validation per quickstart.md phase exit conditions (research decision §9)
- **[P]** marks tasks that touch different files with no in-progress dependencies and can run concurrently
- **`project_context` isolation**: passed ONLY to `src/agents/action.ts` (T015) — no other agent receives it
- **Data isolation**: every Drizzle query against `reports`, `tasks`, `streaks` MUST include `.where(eq(table.userId, session.user.id))` — the only exception is `src/app/share/[id]/page.tsx` (T034) per data-model.md
- **UI boundary**: `STAGE_LABELS` map (T042) is the single source of truth for all user-facing pipeline text — never use raw stage values in UI
- **Contracts are law**: after T016 (orchestrator) and T019 (reports GET), manually verify each output field against the contracts in `specs/002-learnagent-pipeline-build/contracts/` before marking complete
