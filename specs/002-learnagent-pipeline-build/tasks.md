# Tasks: LearnAgent — Pipeline Build on Existing Boilerplate

**Input**: Design documents from `/specs/002-learnagent-pipeline-build/` + model selection design at `docs/superpowers/specs/2026-04-13-model-selection-design.md`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅, model-selection-design.md ✅

**Tests**: No automated tests — manual end-to-end validation per phase exit condition (research decision §9).

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

**Model strategy**: The Vercel AI SDK (`ai` package) is the unified call layer. All agents use `generateWithFallback()` from day one. Users with no saved config get `claude-sonnet-4-6` via server `ANTHROPIC_API_KEY` — zero breaking changes, fully backwards compatible.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Exact file paths included in every description

---

## Phase 1: Setup (Environment, Packages & SDK Clients)

**Purpose**: Install all required packages and create the Supadata client singleton. The Anthropic SDK is no longer installed directly — all AI calls go through the Vercel AI SDK provider adapters.

- [ ] T001 Install packages via `npm install ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/google @ai-sdk/groq @ai-sdk/mistral @openrouter/ai-sdk-provider recharts` and verify all appear in `package.json`; confirm `@anthropic-ai/sdk` is NOT added (direct SDK not needed — Vercel AI SDK wraps it)
- [ ] T002 Add env var placeholders to `env.example`: `ANTHROPIC_API_KEY`, `SUPADATA_API_KEY`, `RAPIDAPI_KEY`, and `ENCRYPTION_KEY` (with comment: "32-byte hex — generate with: openssl rand -hex 32")
- [ ] T003 [P] Create `src/lib/supadata/client.ts` — export `fetchTranscript(videoId: string)` that calls `GET https://api.supadata.ai/v1/youtube/transcript?videoId={videoId}&lang=en` with `x-api-key: SUPADATA_API_KEY`; on 404 or 429 retries once with RapidAPI YouTube Transcript endpoint using `RAPIDAPI_KEY`; throws `{ code: "transcript_unavailable" }` if both fail

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story. Includes all 7 DB tables (4 core + 3 model-selection), URL validation, SSE emitter, and the full model call abstraction layer.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Utilities

- [ ] T004 Create `src/lib/validate-url.ts` — export `extractVideoId(url: string): string | null` that parses all YouTube URL formats (`youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`, `youtube.com/shorts/`) and returns the 11-char video ID matching `^[a-zA-Z0-9_-]{11}$`, or `null` for invalid/private URLs
- [ ] T005 Create `src/lib/pipeline-emitter.ts` — export a module-level `Map<string, EventEmitter>` keyed by `reportId`; export `getEmitter(reportId)` (creates if absent), `removeEmitter(reportId)`, and the SSE event type `PipelineEvent = { stage: string; status: "running" | "complete"; progress: number } | { type: "warning"; message: string } | { type: "done"; report_id: string } | { type: "error"; message: string }`; note the new `warning` event type required by model selection (emitted when fallback is used)

### Database Schema — Core Tables

- [ ] T006 Extend `src/lib/schema.ts` — add `reports` table: `id` (uuid PK defaultRandom), `userId` (text, FK→user.id cascade delete, NOT NULL), `videoId` (text NOT NULL), `videoUrl` (text NOT NULL), `title` (text nullable), `topicCategory` (text nullable), `estimatedDifficulty` (text nullable), `projectContext` (text NOT NULL), `status` (text NOT NULL default `'fetching'`), `isShared` (boolean NOT NULL default false), `createdAt` (timestamp defaultNow NOT NULL), `updatedAt` (timestamp defaultNow NOT NULL); add indexes `reports_user_id_idx` and `reports_created_at_idx`
- [ ] T007 Extend `src/lib/schema.ts` — add `reportSections` table: `id` (uuid PK defaultRandom), `reportId` (uuid, FK→reports.id cascade delete, NOT NULL), `sectionType` (text NOT NULL — values: `concept | highlights | models | examples | actions`), `contentJson` (jsonb NOT NULL), `createdAt` (timestamp defaultNow NOT NULL); add index `report_sections_report_id_idx`
- [ ] T008 Extend `src/lib/schema.ts` — add `tasks` table: `id` (uuid PK defaultRandom), `reportId` (uuid, FK→reports.id cascade delete, NOT NULL), `userId` (text, FK→user.id cascade delete, NOT NULL), `label` (text NOT NULL), `scope` (text NOT NULL — values: `today | week | month`), `completed` (boolean NOT NULL default false), `completedAt` (timestamp nullable), `createdAt` (timestamp defaultNow NOT NULL); add indexes `tasks_user_id_idx`, `tasks_report_id_idx`, `tasks_completed_at_idx`
- [ ] T009 Extend `src/lib/schema.ts` — add `streaks` table: `id` (uuid PK defaultRandom), `userId` (text UNIQUE, FK→user.id cascade delete, NOT NULL), `currentStreak` (integer NOT NULL default 0), `longestStreak` (integer NOT NULL default 0), `lastActiveDate` (date nullable), `updatedAt` (timestamp defaultNow NOT NULL)

### Database Schema — Model Selection Tables

- [ ] T010 Extend `src/lib/schema.ts` — add `userModelConfig` table: `id` (uuid PK defaultRandom), `userId` (text UNIQUE, FK→user.id cascade delete, NOT NULL), `primaryProvider` (text NOT NULL), `primaryModel` (text NOT NULL), `fallbackProvider` (text nullable), `fallbackModel` (text nullable), `dailyCostLimitUsd` (numeric(8,4) NOT NULL default 5.00), `timeoutMs` (integer NOT NULL default 30000), `createdAt` (timestamp defaultNow NOT NULL), `updatedAt` (timestamp defaultNow NOT NULL)
- [ ] T011 Extend `src/lib/schema.ts` — add `userApiKeys` table: `id` (uuid PK defaultRandom), `userId` (text, FK→user.id cascade delete, NOT NULL), `provider` (text NOT NULL), `keyHash` (text NOT NULL — stores AES-256-GCM encrypted key, never plaintext), `createdAt` (timestamp defaultNow NOT NULL), `updatedAt` (timestamp defaultNow NOT NULL); add UNIQUE constraint on `(userId, provider)`
- [ ] T012 Extend `src/lib/schema.ts` — add `reportCostLog` table: `id` (uuid PK defaultRandom), `userId` (text, FK→user.id cascade delete, NOT NULL), `reportId` (uuid, FK→reports.id cascade delete, NOT NULL), `provider` (text NOT NULL), `model` (text NOT NULL), `inputTokens` (integer NOT NULL), `outputTokens` (integer NOT NULL), `estimatedUsd` (numeric(8,6) NOT NULL), `createdAt` (timestamp defaultNow NOT NULL); add indexes `cost_log_user_id_idx` and `cost_log_report_id_idx`

### Model Abstraction Layer

- [ ] T013 [P] Create `src/lib/models/registry.ts` — export `PROVIDERS` object and `MODEL_REGISTRY` constant containing all supported providers and models; supported providers: `anthropic` (claude-haiku-4-5, claude-sonnet-4-6, claude-opus-4-6), `openai` (gpt-4o-mini, gpt-4o, o1-mini, o1), `google` (gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash), `groq` (llama-3.1-8b-instant, llama-3.3-70b-versatile, mixtral-8x7b-32768), `mistral` (mistral-small-latest, mistral-medium-latest, mistral-large-latest), `openrouter` (free-text slug); export `COST_RATES: Record<string, { input: number; output: number }>` with USD-per-token rates per model; OpenRouter models not in the known-rates list use `{ input: 0.000002, output: 0.000002 }`; export `DEFAULT_PRIMARY = { provider: "anthropic", model: "claude-sonnet-4-6" }`
- [ ] T014 [P] Create `src/lib/models/call.ts` — export `generateWithFallback(primary: LanguageModel, fallback: LanguageModel | null, config: { timeoutMs: number; dailyCostLimitUsd: number; userId: string; reportId: string; agentName: "analyst" | "teacher" | "action" }, prompt: { system: string; user: string }, maxTokens?: number): Promise<{ text: string; usedFallback: boolean }>`; implement the 4-step logic: (1) sum `reportCostLog` WHERE `userId=X AND createdAt >= start of today` — if over limit AND fallback exists skip to step 3, if over limit AND no fallback throw `{ code: "model_failed" }`; (2) call `generateText({ model: primary, messages, maxTokens, abortSignal: AbortSignal.timeout(timeoutMs) })` — on success insert into `reportCostLog` and return `{ text, usedFallback: false }`; on `AbortError`, `APICallError`, `RateLimitError`, or `AuthenticationError` go to step 3; (3) if fallback: call `generateText({ model: fallback, messages, maxTokens })` — on success insert into `reportCostLog` and return `{ text, usedFallback: true }`; on error throw `{ code: "all_models_failed" }`; (4) if no fallback: throw `{ code: "model_failed" }`; import `generateText` from `ai` package
- [ ] T015 Create `src/lib/models/client.ts` — export `loadUserModelConfig(userId: string): Promise<{ primary: LanguageModel; fallback: LanguageModel | null; timeoutMs: number; dailyCostLimitUsd: number }>`; steps: (1) query `userModelConfig` WHERE `userId=userId` — if no row return defaults: `{ primary: anthropic("claude-sonnet-4-6"), fallback: null, timeoutMs: 30000, dailyCostLimitUsd: 5.00 }` using server `ANTHROPIC_API_KEY`; (2) for each configured provider query `userApiKeys` and decrypt key using AES-256-GCM with `ENCRYPTION_KEY` env var; (3) build `LanguageModel` using the appropriate Vercel AI SDK adapter: `anthropic(modelId)` from `@ai-sdk/anthropic`, `openai(modelId)` from `@ai-sdk/openai`, `google(modelId)` from `@ai-sdk/google`, `createGroq()(modelId)` from `@ai-sdk/groq`, `createMistral()(modelId)` from `@ai-sdk/mistral`, `createOpenRouter()(modelId)` from `@openrouter/ai-sdk-provider`; if fallback provider key is missing return `fallback: null`; also export `encryptApiKey(plaintext: string): string` and `decryptApiKey(ciphertext: string): string` helpers using AES-256-GCM (these are used by the settings API routes)

### Database Apply

- [ ] T016 Run `npm run db:push` to apply all 7 new tables to local PostgreSQL; open Drizzle Studio at `http://localhost:4983` and confirm `reports`, `report_sections`, `tasks`, `streaks`, `user_model_config`, `user_api_keys`, `report_cost_log` all exist with correct columns and constraints; insert a test row into `reports` and verify it persists

**Checkpoint**: All 7 tables exist; model abstraction layer complete — user story implementation can now begin.

---

## Phase 3: User Story 1 — Submit a YouTube Video and Receive a Project-Specific Action Plan (Priority: P1) 🎯 MVP

**Goal**: Full pipeline from URL submission → agent processing → SSE progress → tabbed report with project-specific action plan. All AI calls go through `generateWithFallback()` from day one.

**Independent Test**: POST to `/api/analyze` with a real YouTube URL and project description; subscribe to the SSE stream; verify a complete 5-section report is returned in under 90 seconds with action plan tasks that explicitly reference both the video content and the project description.

### Agent Pipeline

- [ ] T017 [P] [US1] Create `src/agents/fetcher.ts` — export `runFetcher(videoUrl: string): Promise<FetcherOutput>` where `FetcherOutput = { video_id, video_url, title, transcript_length, language, is_partial, transcript }`; call `src/lib/supadata/client.ts fetchTranscript(videoId)` with the video ID extracted via `extractVideoId`; throw `{ code: "transcript_unavailable" }` if client fails; this agent makes NO AI calls — no modelConfig param needed
- [ ] T018 [P] [US1] Create `src/agents/analyst.ts` — export `runAnalyst(fetcherOutput: FetcherOutput, modelConfig: ModelConfig): Promise<AnalystOutput>` where `AnalystOutput = { video_id, core_concept (one sentence), key_highlights (5–7 strings), mental_models, examples_used, warnings_and_mistakes, key_terms, estimated_difficulty ("beginner"|"intermediate"|"advanced"), topic_category }` and `ModelConfig = { primary: LanguageModel; fallback: LanguageModel | null; timeoutMs: number; dailyCostLimitUsd: number; userId: string; reportId: string }`; call `generateWithFallback(primary, fallback, { ...config, agentName: "analyst" }, prompt, 4096)` with a structured system prompt that demands all output fields as JSON; parse and validate JSON response; throw on contract violation; return `{ ...parsed, usedFallback }`
- [ ] T019 [P] [US1] Create `src/agents/teacher.ts` — export `runTeacher(fetcherOutput: FetcherOutput, analystOutput: AnalystOutput, modelConfig: ModelConfig): Promise<{ markdown: string; usedFallback: boolean }>`; call `generateWithFallback` with system prompt instructing Claude to produce markdown containing exactly the sections `## 🧠 What This Is Really About` and `## 💡 The Key Things You Need to Know`; validate both headings are present in returned text; throw if missing
- [ ] T020 [US1] Create `src/agents/action.ts` — export `runAction(teacherMd: string, analystOutput: AnalystOutput, projectContext: string, modelConfig: ModelConfig): Promise<{ data: ActionOutput; usedFallback: boolean }>` where `ActionOutput = { markdown: string, today: string[3], week: string[3], challenge: string, resources: string[], metrics: string[3] }`; call `generateWithFallback` with system prompt that receives `projectContext` and explicitly instructs that every task must be impossible to write without knowing both the video content AND the user's specific project — generic tasks are contract violations; parse structured JSON; validate array lengths exactly (today=3, week=3, metrics=3, challenge=1 string); throw on violation; `project_context` is passed ONLY to this agent
- [ ] T021 [US1] Create `src/agents/orchestrator.ts` — export `runPipeline(reportId: string, videoUrl: string, projectContext: string, userId: string): Promise<void>`; at pipeline start call `loadUserModelConfig(userId)` once and store as `modelConfig`; sequential execution: (1) emit `{stage:"fetching",status:"running",progress:0}` → call `runFetcher` → update `reports.status="analyzing"` → emit `{stage:"fetching",status:"complete",progress:20}`; (2) emit `{stage:"analyzing",status:"running",progress:20}` → call `runAnalyst(fetcherOutput, modelConfig)` → if `usedFallback` emit `{type:"warning",message:"Switched to your backup model for this step"}` → update `reports.status="teaching"` → emit `{stage:"analyzing",status:"complete",progress:40}`; (3) emit `{stage:"teaching",status:"running",progress:40}` → call `runTeacher(fetcherOutput, analystOutput, modelConfig)` → if `usedFallback` emit warning → update `reports.status="planning"` → emit `{stage:"teaching",status:"complete",progress:60}`; (4) emit `{stage:"planning",status:"running",progress:60}` → call `runAction(teacherMd, analystOutput, projectContext, modelConfig)` → if `usedFallback` emit warning → emit `{stage:"planning",status:"complete",progress:80}`; (5) emit `{stage:"saving",status:"running",progress:80}` → save 5 rows to `reportSections` → save task rows → update `reports.status="complete"` → emit `{stage:"saving",status:"complete",progress:100}` → emit `{type:"done",report_id:reportId}` → call `removeEmitter(reportId)`; on `all_models_failed` or `model_failed` error: update `reports.status="failed"` → emit `{type:"error",message:"We couldn't reach the AI model. Please check your model settings and try again."}` → call `removeEmitter(reportId)`; on any other unrecoverable error: update `reports.status="failed"` → emit `{type:"error",message:"We couldn't process this video. Please try again."}` → call `removeEmitter(reportId)`; all Drizzle queries include `.where(eq(reports.userId, userId))`

### API Endpoints

- [ ] T022 [US1] Create `src/app/api/analyze/route.ts` — POST handler: (1) authenticate via `src/lib/session.ts` — return 401 if no session; (2) parse body, call `extractVideoId(url)` — return 400 `{error:"invalid_url",message:"Please provide a valid YouTube video URL."}` if null; (3) validate `project_context.trim().length >= 10` — return 400 `{error:"missing_context",message:"Please describe what you are currently building."}` if not; (4) query `reports` WHERE `userId=session.user.id` AND `status IN ('fetching','analyzing','teaching','planning')` — return 409 `{error:"generation_active",message:"A report is already being generated. Please wait for it to complete."}` if found; (5) insert new `reports` row with `status="fetching"`; (6) call `runPipeline(reportId, url, project_context, userId)` with no await (fire-and-forget, wrapped in `.catch` to prevent unhandled rejection); (7) return 202 `{report_id, status:"fetching"}`
- [ ] T023 [US1] Create `src/app/api/analyze/[id]/stream/route.ts` — GET handler: authenticate; verify the report exists and `reports.userId = session.user.id` — return 404 if not found/not owned; if `reports.status = "complete"` immediately return `data: {"type":"done","report_id":"<id>"}\n\n`; otherwise subscribe to `getEmitter(id)` and return a `ReadableStream` with `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`; format each `PipelineEvent` as `data: <json>\n\n`; pass through `warning` events as-is; close stream on `done` or `error` events; handle client disconnect via `signal.addEventListener("abort", ...)`
- [ ] T024 [US1] Create `src/app/api/reports/[id]/route.ts` — GET handler: authenticate; query `reports` WHERE `id=param` AND `userId=session.user.id` — return 404 `{error:"not_found"}` if missing, 403 `{error:"forbidden"}` if owned by someone else; join `reportSections` and `tasks`; assemble `sections` object keyed by `sectionType`; return full report object per `contracts/api-reports.md` GET `/api/reports/[id]` response contract

### UI Components

- [ ] T025 [P] [US1] Create `src/components/report/ConceptTab.tsx` — accepts `concept: { core_concept: string; explanation: string }`; renders a shadcn `Card` with the concept as a large heading and explanation as body text
- [ ] T026 [P] [US1] Create `src/components/report/HighlightsTab.tsx` — accepts `highlights: { items: string[] }`; renders a shadcn `Card` with a numbered list of highlight items (5–7)
- [ ] T027 [P] [US1] Create `src/components/report/ModelsTab.tsx` — accepts `models: { items: Array<{ name: string; description: string }> }`; renders a shadcn `Card` with each model as a bold name + description paragraph
- [ ] T028 [P] [US1] Create `src/components/report/ExamplesTab.tsx` — accepts `examples: { items: string[] }`; renders a shadcn `Card` with a bulleted list of real examples from the video
- [ ] T029 [P] [US1] Create `src/components/report/ActionPlanTab.tsx` — accepts `actions: ActionOutput` and `tasks: TaskItem[]`; renders four sections: "Do Today" (3 items), "This Week" (3 items), "30-Day Challenge" (1 item), "Resources", "How to Know It's Working" (3 metrics); renders task items with `label` text only and a placeholder `checked` prop (wired in US2); renders project context label above the plan

### UI Screens

- [ ] T030 [US1] Create `src/app/(app)/home/page.tsx` — client component: YouTube URL input + project context textarea (≥10 chars, validated on submit); on submit calls `POST /api/analyze`, navigates to `/process/[report_id]` on 202; on 409 displays friendly "already generating" message and disables form; if user has existing complete reports, renders 3–5 most recent as summary cards (title, topicCategory, createdAt) fetched from `GET /api/reports?limit=5`; all error messages use user-friendly text (no internal terms)
- [ ] T031 [US1] Create `src/app/(app)/process/[id]/page.tsx` — client component: connects to `GET /api/analyze/[id]/stream` via `EventSource`; renders 5 progress steps using the UI label map from `src/lib/sse-labels.ts` (created in Polish phase — inline the map here for now): fetching→"Reading the video", analyzing→"Analyzing the content", teaching→"Writing your summary", planning→"Crafting your action plan", saving→"Saving your report"; animates the current active step; on `{type:"warning"}` shows a non-blocking inline toast "Switched to your backup model for this step" (no stage interruption); on `{type:"done"}` auto-navigates to `/report/[report_id]`; on `{type:"error"}` shows friendly error message with retry button linking back to `/home`
- [ ] T032 [US1] Create `src/app/(app)/report/[id]/page.tsx` — server component: fetches `/api/reports/[id]`; renders shadcn `Tabs` with 5 tabs in order: "Action Plan" (default active, pinned first), "Core Concept", "Key Highlights", "Mental Models", "Real Examples"; passes section data to `ActionPlanTab`, `ConceptTab`, `HighlightsTab`, `ModelsTab`, `ExamplesTab`; renders video title and topic category in page header; no internal terms in any visible text

**Checkpoint**: Full pipeline and report display functional — submit a real URL and verify all 5 tabs render with contract-valid content.

---

## Phase 4: User Story 2 — Mark Tasks Complete and Maintain a Learning Streak (Priority: P2)

**Goal**: Task completion persists across sessions; streak counter updates in real time in the header on every authenticated page.

**Independent Test**: Check off a task on any report, reload the page, sign out, sign back in — task remains checked. Streak counter in header reflects the change in real time without page reload.

- [ ] T033 [US2] Create `src/app/api/tasks/[id]/route.ts` — PATCH handler: authenticate; query `tasks` WHERE `id=param` AND `userId=session.user.id` — return 404 if not found, 403 if owned by another user; update `completed` to requested value; if `completed=true` set `completedAt=now()`, if `completed=false` set `completedAt=null`; upsert `streaks` row for user using streak algorithm: if `lastActiveDate=today` no change, if `lastActiveDate=yesterday` increment `currentStreak`, if `lastActiveDate<yesterday` reset `currentStreak=1`; update `longestStreak` if `currentStreak>longestStreak`; update `streaks.updatedAt`; return `{ id, completed, completedAt, streak: { currentStreak, longestStreak, lastActiveDate } }` per `contracts/api-tasks.md`
- [ ] T034 [US2] Create `src/app/api/streak/route.ts` — GET handler: authenticate; query `streaks` WHERE `userId=session.user.id`; if no row exists return `{ currentStreak: 0, longestStreak: 0, lastActiveDate: null }`; otherwise return the streak row per `contracts/api-share.md` GET `/api/streak` contract
- [ ] T035 [US2] Update `src/components/report/ActionPlanTab.tsx` — add `onTaskToggle?: (taskId: string, newStreak: { currentStreak: number }) => void` prop; wire each task item checkbox to call `PATCH /api/tasks/[id]` with `{ completed: !current }`; on success apply immediate visual style (strikethrough + `text-muted-foreground` on completed tasks); call `onTaskToggle` with the returned streak value so the parent can propagate to the header
- [ ] T036 [US2] Update `src/app/(app)/report/[id]/page.tsx` — make it a client component (or add a client wrapper); add `streakCount` state initialized from `/api/streak`; pass `onTaskToggle` handler to `ActionPlanTab` that updates `streakCount` state; pass `streakCount` up to the layout via a React context defined in the next task
- [ ] T037 [US2] Create `src/contexts/StreakContext.tsx` — React context + provider with `currentStreak` and `setCurrentStreak`; wrap `src/app/(app)/layout.tsx` with the provider; add a streak display (e.g. "🔥 N") to the layout's header/nav that reads from `StreakContext` and fetches initial value from `GET /api/streak` on mount; update context value from `onTaskToggle` callbacks

**Checkpoint**: Task completion persists across sessions; streak counter visible in header on every authenticated page; updates in real time on task toggle.

---

## Phase 5: User Story 3 — Share a Report and Export the Action Plan (Priority: P3)

**Goal**: Public share link renders the full report for unauthenticated visitors; action plan copies as valid Markdown.

**Independent Test**: Toggle share on, open `/share/[id]` in a private window with no session — full report renders. Toggle share off — link returns 404. "Copy as Markdown" pastes valid structured Markdown.

- [ ] T038 [P] [US3] Create `src/app/api/reports/[id]/share/route.ts` — POST handler: authenticate; query `reports` WHERE `id=param` AND `userId=session.user.id` — return 404 if not found; update `isShared` to requested boolean; return `{ id, isShared }` per `contracts/api-reports.md` POST `/api/reports/[id]/share` contract
- [ ] T039 [P] [US3] Create `src/app/share/[id]/page.tsx` — server component (no auth): query `reports` WHERE `id=param` AND `isShared=true` using a service-level Drizzle query (no userId filter — this is the one permitted bypass per data-model.md); if not found or not shared return `notFound()` (Next.js 404); join `reportSections`; render all 5 sections read-only (no task checkboxes, no share toggle, no userId exposed); add Open Graph meta tags for title and description; exclude any internal terms from visible text
- [ ] T040 [US3] Update `src/app/(app)/report/[id]/page.tsx` — add Share button that calls `POST /api/reports/[id]/share {isShared:true}` then copies `${window.location.origin}/share/${id}` to clipboard and shows a toast confirmation; add a "Disable sharing" button shown when `isShared=true` that calls the same endpoint with `{isShared:false}`; add "Copy as Markdown" button in the Action Plan tab area that copies `actions.markdown` to clipboard and shows a toast

**Checkpoint**: Share link works for unauthenticated visitors; 404 when disabled; Markdown copy produces valid output.

---

## Phase 6: User Story 4 — Browse and Search Past Reports (Priority: P4)

**Goal**: Searchable library of all completed reports, most recent first, with client-side filtered results and correct empty state.

**Independent Test**: Generate two reports with different topics; navigate to `/library`; both appear. Type a term matching only one — filter works without page reload. Empty state renders for new user.

- [ ] T041 [P] [US4] Create `src/app/api/reports/route.ts` — GET handler: authenticate; accept query params `page` (default 1), `limit` (default 20, max 50), `q` (search term); query `reports` WHERE `userId=session.user.id` AND `status="complete"` AND (if `q` present) `title ILIKE %q%` OR `topicCategory ILIKE %q%`; order by `createdAt DESC`; return `{ reports: [...], total, page, limit }` per `contracts/api-reports.md` GET `/api/reports` contract
- [ ] T042 [P] [US4] Create `src/components/library/ReportCard.tsx` — accepts report object; renders a shadcn `Card` with title, `topicCategory` as a badge, `estimatedDifficulty` badge, formatted `createdAt` date; entire card is a link to `/report/[id]`
- [ ] T043 [US4] Create `src/app/(app)/library/page.tsx` — client component: search input that debounces 300ms and calls `GET /api/reports?q=<term>`; renders a list of `ReportCard` components; when `reports.length === 0` and search is empty: renders empty state card with friendly message and a `Link` to `/home`; when `reports.length === 0` and search has a term: renders "No reports match your search" message

**Checkpoint**: Searchable library works with real data; empty state renders correctly for new accounts.

---

## Phase 7: User Story 5 — View a Progress Dashboard with Real Data (Priority: P5)

**Goal**: Dashboard showing current streak, total reports, total tasks completed, and 30-day activity chart — all populated with real data, no placeholder zeros.

**Independent Test**: After generating at least one report and completing at least one task, visit `/progress` and verify all four metrics display real data with no empty states or stub values.

- [ ] T044 [P] [US5] Create `src/components/dashboard/StatsCards.tsx` — accepts `{ streak, totalReports, totalTasksCompleted }`; renders three shadcn `Card` metric tiles; if all metrics are zero and user has no reports, renders an empty state CTA card instead of zero values
- [ ] T045 [P] [US5] Create `src/components/dashboard/ActivityChart.tsx` — accepts `data: Array<{ date: string; tasksCompleted: number }>` (30-day array); renders a Recharts `BarChart` with date on X-axis and count on Y-axis; if all values are zero renders an empty state card with CTA to `/home`
- [ ] T046 [US5] Create `src/app/(app)/progress/page.tsx` — server component: query `streaks` for current user; count `reports` WHERE `userId=session.user.id` AND `status="complete"`; count `tasks` WHERE `userId=session.user.id` AND `completed=true`; query `tasks` WHERE `userId=session.user.id` AND `completedAt >= now()-30days` grouped by UTC date for chart data; render `StatsCards` + `ActivityChart`; if user has zero reports and zero completed tasks render a single full-page empty state with CTA to `/home`

**Checkpoint**: All four dashboard metrics accurate; chart renders with real data; empty state shows for new users.

---

## Phase 8: User Story 6 — Configure AI Model Provider and API Keys (Priority: P6)

**Goal**: Users can set a primary AI model (from any supported provider), an optional fallback, their own API keys, and fallback trigger thresholds. Users with no config get the default (claude-sonnet-4-6 via server key) — zero friction for new users.

**Independent Test**: Save an OpenAI config with a valid key; generate a report; verify the cost log records `openai` as provider. Test the connection button returns ✓ for a valid key and error for an invalid one. Delete the primary key — Save Settings disables.

### API Endpoints

- [ ] T047 [P] [US6] Create `src/app/api/settings/models/route.ts` — GET handler: authenticate; query `userModelConfig` WHERE `userId=session.user.id`; query `userApiKeys` WHERE `userId=session.user.id`; return `{ primaryProvider, primaryModel, fallbackProvider, fallbackModel, dailyCostLimitUsd, timeoutMs, savedProviders: string[] }` with API key values masked (last 4 chars only — never expose full key); if no config row exists return the defaults `{ primaryProvider: "anthropic", primaryModel: "claude-sonnet-4-6", fallbackProvider: null, fallbackModel: null, dailyCostLimitUsd: 5.00, timeoutMs: 30000, savedProviders: [] }`; POST handler: authenticate; body `{ primaryProvider, primaryModel, fallbackProvider?, fallbackModel?, dailyCostLimitUsd?, timeoutMs? }`; upsert `userModelConfig`; return updated config (masked)
- [ ] T048 [P] [US6] Create `src/app/api/settings/models/keys/route.ts` — POST handler: authenticate; body `{ provider, apiKey }`; validate provider is in `PROVIDERS` from registry; encrypt `apiKey` using `encryptApiKey()` from `src/lib/models/client.ts`; upsert into `userApiKeys`; return `{ provider, maskedKey: "••••" + apiKey.slice(-4) }`; DELETE handler: authenticate; body `{ provider }`; delete from `userApiKeys` WHERE `userId=session.user.id` AND `provider=provider`; if deleted provider matches `userModelConfig.primaryProvider` or `fallbackProvider`, clear that field in `userModelConfig` too; return `{ success: true }`
- [ ] T049 [P] [US6] Create `src/app/api/settings/models/test/route.ts` — POST handler: authenticate; body `{ provider, model, apiKey }`; build a `LanguageModel` for the given provider using the provided `apiKey` (do NOT save — test only); call `generateText` with prompt "Reply with: ok" and `maxTokens: 5`; if response contains "ok" return `{ ok: true }`; on any error return `{ ok: false, error: string }` with a user-friendly message; never log or persist the test API key

### Settings UI

- [ ] T050 [US6] Create `src/app/(app)/settings/models/page.tsx` — client component; fetch current config from `GET /api/settings/models` on mount; render 4 sections: (1) **Primary Model** — provider dropdown populated from `MODEL_REGISTRY`, model dropdown repopulates on provider change, OpenRouter provider shows free-text input instead of dropdown, API key input shows `••••[last4]` if saved (user must retype to update), Save/Delete key buttons; (2) **Fallback Model** — same structure, entirely optional, can be left blank; (3) **Fallback Triggers** — timeout input in seconds (default 30), daily cost limit input in USD (default $5.00), note that API errors always trigger fallback (not toggleable); (4) **Actions** — "Test Connection" button calls `POST /api/settings/models/test` with current field values and shows inline ✓ or error, "Save Settings" button calls `POST /api/settings/models` and is disabled with tooltip if primary key is missing for the selected provider, "Delete Key" button shows confirmation before calling DELETE; all labels use user-friendly language (no internal SDK names exposed)

**Checkpoint**: Config saves; connection test works; cost log records correct provider after a report generation.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Shared constants, persistent generation indicator, terminology audit, final end-to-end validation.

- [ ] T051 Create `src/lib/sse-labels.ts` — export `const STAGE_LABELS: Record<string, string> = { fetching: "Reading the video", analyzing: "Analyzing the content", teaching: "Writing your summary", planning: "Crafting your action plan", saving: "Saving your report" }` and `const STAGE_ORDER = ["fetching","analyzing","teaching","planning","saving"]`; update `src/app/(app)/process/[id]/page.tsx` to import and use these constants instead of inline strings
- [ ] T052 [P] Create `src/components/GenerationBanner.tsx` — client component: reads active generation state from a `GenerationContext` (set when `POST /api/analyze` returns 202, cleared when SSE stream emits `done`/`error`); when active renders a subtle persistent top banner reading "Generating your report..." with a spinner; add `GenerationContext` provider to `src/app/(app)/layout.tsx`; store active `reportId` in `sessionStorage` so the banner persists across soft navigations
- [ ] T053 Audit all visible UI strings across `src/app/(app)/`, `src/app/share/`, and `src/components/` — search for internal terms (`fetching`, `analyzing`, `teaching`, `planning`, `orchestrator`, `fetcher`, `analyst`, `teacher`, `action agent`, `pipeline`, `generateWithFallback`, `LanguageModel`) in any string that renders to the DOM; replace each found instance with the corresponding user-friendly label from `STAGE_LABELS` or a plain-language equivalent
- [ ] T054 Run the full `quickstart.md` end-to-end checklist: `npm run db:push`, `npm run dev`, execute Phase 3 curl commands to verify pipeline completes in <90s, then manually run Phases 4–10 browser checks and confirm all exit conditions are met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories; model abstraction layer (T013–T015) must complete before any agent is written
- **Phase 3 (US1)**: Depends on Phase 2 completion — agents use `generateWithFallback()` from the start
- **Phase 4 (US2)**: Depends on Phase 3 (needs tasks in DB, ActionPlanTab to update)
- **Phase 5 (US3)**: Depends on Phase 3 (needs complete reports to share)
- **Phase 6 (US4)**: Depends on Phase 3 (needs complete reports to list)
- **Phase 7 (US5)**: Depends on Phase 3 + Phase 4 (needs reports and completed tasks)
- **Phase 8 (US6)**: Depends on Phase 2 (model layer already built — settings UI just exposes it)
- **Phase 9 (Polish)**: Depends on all stories complete

### Within Each Phase

- T013 (registry) and T014 (call.ts) can run in parallel (different files)
- T015 (client.ts) depends on T013 + T014
- T016 (db:push) depends on T006–T012 all being written
- T017–T019 (fetcher, analyst, teacher agents) can run in parallel after T015
- T020 (action agent) depends on T018 + T019 (uses their output types)
- T021 (orchestrator) depends on T017–T020 all complete
- T022–T024 (API routes) depend on T021
- T025–T029 (UI components) can be built in parallel while API routes are being built
- T030–T032 (screens) depend on their respective API routes and components
- T047–T049 (model settings API) can be built in parallel after Phase 2
- T050 (settings UI) depends on T047–T049

### Parallel Opportunities

Within Phase 2:
- T004, T005 (utilities) can run in parallel
- T006–T012 (schema tables) can be written in parallel (same file, but sequential appends — run sequentially)
- T013, T014 (registry + call.ts) can run in parallel

Within Phase 3 (after T021 complete):
- T022, T023, T024 (API routes) in parallel
- T025, T026, T027, T028, T029 (UI components) in parallel

Within Phase 8:
- T047, T048, T049 (settings API routes) in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T016) — CRITICAL blocker; model layer here
3. Complete Phase 3: User Story 1 (T017–T032)
4. **STOP and VALIDATE**: Run quickstart.md Phase 3 + 4 + 5 + 6 curl and browser checks
5. Deploy to Vercel for early feedback

### Incremental Delivery

1. Setup + Foundational → schema, utilities, and full model abstraction ready
2. US1 complete → Full pipeline works end-to-end using `generateWithFallback()` (MVP!)
3. US2 complete → Task completion + streak live
4. US3 complete → Sharing + Markdown export
5. US4 complete → Searchable library
6. US5 complete → Progress dashboard
7. US6 complete → Multi-provider model settings live
8. Polish → Production-ready

---

## Notes

- **No automated tests** — manual validation per quickstart.md phase exit conditions (research decision §9)
- **[P]** marks tasks that touch different files with no in-progress dependencies and can run concurrently
- **`project_context` isolation**: passed ONLY to `src/agents/action.ts` (T020) — no other agent receives it
- **Data isolation**: every Drizzle query against `reports`, `tasks`, `streaks`, `userModelConfig`, `userApiKeys`, `reportCostLog` MUST include `.where(eq(table.userId, session.user.id))` — the only exception is `src/app/share/[id]/page.tsx` (T039) per data-model.md
- **API key security**: keys are encrypted with AES-256-GCM; never logged, never returned in full; masked to last 4 chars in all API responses
- **UI boundary**: `STAGE_LABELS` map (T051) is the single source of truth for all user-facing pipeline text — never use raw stage values in UI; no AI SDK names exposed
- **Contracts are law**: after T021 (orchestrator) and T024 (reports GET), manually verify each output field against the contracts in `specs/002-learnagent-pipeline-build/contracts/` before marking complete
- **Backwards compatibility**: users with no `userModelConfig` row get `claude-sonnet-4-6` via server `ANTHROPIC_API_KEY` — first-time users need zero setup
