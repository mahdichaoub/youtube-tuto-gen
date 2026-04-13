# Feature Specification: LearnAgent — Pipeline Build on Existing Boilerplate

**Feature Branch**: `002-learnagent-pipeline-build`
**Created**: 2026-04-12
**Status**: Draft
**Input**: User description: "LearnAgent implementation — multi-agent YouTube-to-action-plan pipeline built on top of the agentic boilerplate"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit a YouTube Video and Receive a Project-Specific Action Plan (Priority: P1)

A developer building a SaaS payment integration finds a YouTube video on API design patterns.
They sign in, paste the video URL, describe their current project in a sentence, and submit.
A processing screen shows six distinct progress steps as the pipeline runs. Within 90 seconds
they are automatically taken to a structured report containing a core concept, key highlights,
mental models, real examples from the video, and — most importantly — an action plan with tasks
tied directly to what they are building.

**Why this priority**: This is the entire product. Without this flow working end-to-end, nothing
else in LearnAgent has value. Every other user story depends on at least one report existing.

**Independent Test**: Submit a real YouTube URL with a project description and verify the
returned report contains all five sections, with action plan tasks that are impossible to write
without knowing both the specific video content and the stated project description.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the home screen, **When** they submit a valid YouTube URL and
   a project description of at least 10 characters, **Then** they are navigated to a processing
   screen that displays exactly six user-friendly named progress steps updating in real time.

2. **Given** the processing screen is active, **When** the pipeline completes, **Then** the user
   is automatically navigated to the report screen without any manual action required.

3. **Given** a completed report, **When** a reviewer reads the action plan, **Then** every task
   in the Do Today, This Week, and 30-Day Challenge sections explicitly references both the
   video content and the user's stated project — generic tasks that could apply to any video on
   the topic are not acceptable.

4. **Given** a YouTube URL whose transcript cannot be retrieved, **When** the user submits,
   **Then** they see a friendly, jargon-free error message and remain on the home screen with
   their inputs intact.

5. **Given** a valid URL submitted by an authenticated user, **When** generation exceeds 90
   seconds, **Then** the system marks the report as failed, shows a retry option, and no partial
   or corrupt data is saved.

---

### User Story 2 - Mark Tasks Complete and Maintain a Learning Streak (Priority: P2)

A user returns to a report they generated yesterday and completes one of the "Do Today" tasks.
They check it off. The completion persists across page refreshes and re-login. Their daily streak
counter increments and they can see how many consecutive days they have been acting on what they
have learned.

**Why this priority**: Task completion and streak visibility are the primary retention mechanism.
Without them users have no reason to return after generating their first report.

**Independent Test**: Check off a task on any report, reload the page, sign out, sign back in,
and verify the task remains checked and the streak counter reflects the day's activity.

**Acceptance Scenarios**:

1. **Given** a user on any report page, **When** they check a task, **Then** the task is
   immediately marked complete and remains checked after page refresh and re-login.

2. **Given** a user who completed a task today and completed a task yesterday, **When** they
   view any page showing their streak, **Then** the counter shows at least 2 consecutive days.

3. **Given** a user who last completed a task 48+ hours ago, **When** they view their streak,
   **Then** the streak counter shows the break and does not continue from the previous active
   period until a new task is completed.

---

### User Story 3 - Share a Report and Export the Action Plan (Priority: P3)

A user generates a report and wants to share it with a colleague who has no account. They click
Share, get a public link, and send it. The colleague opens it in a private window and reads the
full report with no sign-in prompt. The user also clicks "Copy as Markdown" and pastes their
action plan into Notion.

**Why this priority**: Sharing drives organic acquisition. Markdown export embeds the product into
daily workflows. Both reinforce the value of the core pipeline.

**Independent Test**: Open a share link in a browser with no active session and verify the full
report renders with all sections. Copy as Markdown and paste into a text editor; verify it is
valid, structured Markdown.

**Acceptance Scenarios**:

1. **Given** a user on a report page, **When** they click "Share", **Then** a unique public link
   is copied to their clipboard and, when opened in a new private window with no active session,
   the full report renders correctly including all five content sections.

2. **Given** a user on a report page, **When** they click "Copy as Markdown", **Then** the
   clipboard contains the action plan in valid Markdown, with all tasks, milestones, and the
   30-day challenge formatted and ready to paste.

---

### User Story 4 - Browse and Search Past Reports (Priority: P4)

A user has generated 12 reports over the past month. They want to find the one about database
indexing from two weeks ago. They open the library, type "database", and find it immediately.
The result shows the report title, date, topic category, and estimated difficulty.

**Why this priority**: The library makes accumulated learning visible and creates switching costs.
It is the reason users do not abandon the product after their first report.

**Independent Test**: Generate at least two reports with different topics, navigate to the
library, and verify both appear. Search by a term matching only one report and verify the filter
works without a page reload.

**Acceptance Scenarios**:

1. **Given** a user with multiple completed reports, **When** they navigate to the library,
   **Then** all their reports are listed in reverse-chronological order with title, topic
   category, estimated difficulty, and creation date visible.

2. **Given** a user typing in the library search field, **When** they finish typing,
   **Then** only reports matching the search term in title or topic are shown and results update
   without a full page reload.

---

### User Story 5 - View a Progress Dashboard with Real Data (Priority: P5)

A user navigates to the progress dashboard and sees their current streak, total reports
generated, total tasks completed, and a 30-day activity chart — all populated with their
real data.

**Why this priority**: The dashboard makes progress tangible and motivates users to sustain their
streak. It depends on task completion data (US2) existing first.

**Independent Test**: After generating at least one report and completing at least one task,
navigate to the dashboard and verify no empty states, placeholder numbers, or stub data appear.

**Acceptance Scenarios**:

1. **Given** a user with at least one completed report and one completed task, **When** they
   visit the progress dashboard, **Then** all four metrics (streak, reports total, tasks total,
   30-day chart) render with their actual data — no zeros used as placeholders when real data
   exists.

---

### Edge Cases

- What happens when the user submits the same YouTube URL twice? A new report is created each
  time because the project description may differ.
- What happens if the user submits a new URL while a report is already generating? The submission
  is blocked. The home screen submit button MUST be disabled and display a friendly "already
  generating" message for the duration of any active generation. No second pipeline is started.
- What happens if the video has no English transcript? The system attempts auto-generated
  transcript; if unavailable it shows a friendly error with no technical jargon.
- What happens if the user submits an invalid or private YouTube URL? The URL is validated
  before any pipeline work begins and a clear error is shown immediately.
- What happens if report generation exceeds 90 seconds? The report is marked failed; a retry
  option is presented; no partial data is stored.
- What happens if the user's session expires while the pipeline is running? The pipeline result
  is saved to the database; the user retrieves the completed report after re-authentication.
- What happens if the user navigates away from the processing screen mid-generation? The pipeline
  continues server-side. If the user returns to the processing URL, they re-join the live
  progress view. If they navigate elsewhere within the app, a persistent in-app indicator MUST
  show that a generation is active. The report appears in the library upon completion.
- What happens if the Supadata transcript API is unavailable? The system attempts the RapidAPI
  YouTube Transcript fallback; if both fail, a friendly error is shown.

## Requirements *(mandatory)*

### Functional Requirements

**Pipeline & Reports**

- **FR-001**: Users MUST be able to submit a YouTube URL and a project description (minimum 10
  characters) to trigger report generation from the home screen. The submission form MUST be
  the primary, visually prominent element on the home screen at all times. When the user has
  existing reports, the 3–5 most recent reports MUST appear below the form as quick-access
  cards — title, topic category, and creation date visible on each card.
- **FR-002**: The system MUST validate the YouTube URL format and accessibility before starting
  the pipeline. Invalid or private URLs MUST be rejected immediately with a user-friendly message.
- **FR-003**: The system MUST display real-time progress during report generation with exactly
  six user-facing progress steps — one per pipeline stage — using friendly labels (no internal
  stage names, agent names, or technical vocabulary visible to the user).
- **FR-004**: The system MUST generate a complete report containing all five sections: core
  concept, key highlights (5–7), mental models, real examples from the video, and a
  project-specific action plan.
- **FR-005**: The action plan MUST contain exactly: 3 immediate tasks (Do Today), 3 milestones
  (This Week), 1 thirty-day challenge (specific to video + project), a resource list, and 3
  measurable success metrics.
- **FR-006**: Every action plan item MUST be specific to both the video content and the user's
  project description. Items that could apply to any video on the same topic are contract
  violations and MUST NOT be returned.
- **FR-007**: The processing screen MUST automatically navigate the user to the completed report
  upon successful pipeline completion.
- **FR-008**: Report generation MUST complete in under 90 seconds for any valid video with an
  available transcript. If generation fails or times out, a retry option MUST be presented.
- **FR-008a**: Only one report generation MAY be active per user at any time. If a generation is
  in progress, the submission form MUST be disabled with a friendly status message. A second
  pipeline MUST NOT be started until the active one reaches `complete` or `failed`.
- **FR-008b**: The pipeline MUST run entirely server-side. If the user navigates away from the
  processing screen, generation MUST continue uninterrupted. A persistent in-app indicator MUST
  be visible on all pages while any generation is active. Returning to the processing URL MUST
  re-join the live progress view at the current stage.

**Task Tracking & Streaks**

- **FR-009**: Users MUST be able to mark individual tasks as complete or incomplete directly from
  the report page. Completion state MUST persist across sessions and page refreshes. Upon
  checking a task, the task MUST immediately apply a visual completed style (e.g., strikethrough
  text and muted appearance) without a page reload. The streak counter in the header MUST update
  in real time to reflect the new streak value without requiring a page reload.
- **FR-010**: The system MUST track and display a per-user daily learning streak, updated whenever
  a task is completed. A streak day is defined as any calendar day on which at least one task was
  completed. The streak counter MUST be visible in the main navigation or header on every
  authenticated page — not only on the progress dashboard.
- **FR-011**: The streak counter MUST reset to zero if the user goes 48 consecutive hours without
  completing any task.

**Library**

- **FR-012**: Users MUST be able to view all their past reports in a searchable list, ordered
  most-recent-first by default.
- **FR-013**: Library search MUST filter by title and topic category without requiring a page
  reload. Results MUST update as the user types.

**Sharing & Export**

- **FR-014**: Users MUST be able to toggle sharing on or off for any completed report. When
  sharing is enabled, a unique public link is generated and copied to the user's clipboard. The
  linked report MUST be fully readable by a visitor with no active session and no sign-in prompt.
  When sharing is disabled, the previously generated link MUST immediately become inaccessible.
- **FR-015**: Users MUST be able to copy the action plan section as plain Markdown with a single
  click. The copied text MUST be valid Markdown ready to paste into any text editor.
- **FR-015a**: The report page MUST display all five content sections as tabbed cards. Each
  section occupies its own tab. The action plan tab MUST be visually prominent — either the
  default active tab on load or pinned as the first tab in the sequence.

**Progress Dashboard**

- **FR-016**: Users MUST be able to view a progress dashboard showing: current streak, total
  reports generated, total tasks completed, and a 30-day activity chart — all populated with
  real data.

**Empty States**

- **FR-019**: When a user has no reports yet, the library MUST display a friendly empty state
  with a call-to-action prompt and a direct link to the home screen. It MUST NOT render a blank
  page or a list of zeros.
- **FR-020**: When a user has no reports or completed tasks yet, the progress dashboard MUST
  display a friendly empty state with a call-to-action prompt and a direct link to the home
  screen. Metric counters MUST NOT display zeros as if they represent real data.

**Security & Data Isolation**

- **FR-018**: All user data — reports, report sections, tasks, and streak records — MUST be
  strictly isolated per user. A user MUST NOT be able to read, write, or infer another user's
  data under any circumstances. Isolation MUST be enforced at the data access layer, not solely
  in application route handlers. The only exception is a report whose owner has explicitly
  enabled sharing (FR-014), which is readable by anyone via its public link.

**Error Handling**

- **FR-017**: All error states — invalid URL, unavailable transcript, generation failure, network
  error — MUST display user-friendly messages with no internal technical terminology, agent names,
  or pipeline vocabulary.

### Key Entities

- **Report**: The primary output. Contains video metadata (video ID, URL, title), topic category,
  estimated difficulty, the project description that seeded it, generation status, and creation
  timestamp. Always belongs to one user. Sharing is a toggleable boolean — when enabled a
  public link is active; when disabled the link is immediately inaccessible. Generation status
  follows a six-value lifecycle: `fetching → analyzing → teaching → planning → complete | failed`.
  These are internal storage values; the processing screen MUST display user-friendly labels
  mapped from each state (never the raw state name).
- **Report Section**: A named content block within a report. Section types: concept, highlights,
  mental models, examples, action plan. Each stores its content as structured JSON.
- **Task**: An individual actionable item extracted from the action plan. Has a time scope
  (today / week / month), a completion state (boolean), and a completion timestamp. Belongs
  to one report and one user.
- **Project Description**: A free-text string entered by the user at submission time, describing
  their current project. Stored with the report; used exclusively to personalize the action plan.
- **Streak**: A per-user derived metric — the count of consecutive calendar days on which at
  least one task was completed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can submit a YouTube URL and project description and receive a complete
  5-section report in under 90 seconds for any video with an available transcript.
- **SC-002**: Every action plan item in every generated report is verifiably tied to both the
  specific video content and the user's stated project — no generic filler tasks.
- **SC-003**: A public share link loads the full report for an unauthenticated visitor within
  3 seconds on a standard connection.
- **SC-004**: Task completion state persists correctly across all page refreshes and re-logins —
  zero data loss tolerance.
- **SC-005**: Library search results update within 1 second of the user finishing typing, for
  users with up to 50 reports.
- **SC-006**: The progress dashboard renders all four metrics with accurate real data in under
  2 seconds for users with up to 100 reports.
- **SC-007**: All error states present a user-facing message with no technical jargon, agent
  names, or internal pipeline vocabulary.

## Clarifications

### Session 2026-04-12

- Q: What are the valid lifecycle states for a Report's generation status? → A: Six states tied to pipeline stage: `fetching | analyzing | teaching | planning | complete | failed`. These are internal DB values only; the processing screen displays user-friendly label text mapped from each state.
- Q: Can a user submit a new video while a report is already generating? → A: No. One active generation per user at a time. Submission form is disabled with a friendly message while any generation is active.
- Q: Can a share link be revoked after it is generated? → A: Yes. Sharing is a toggleable boolean per report. Disabling sharing immediately makes the link inaccessible.
- Q: Is user data isolation enforced at the data layer or application layer only? → A: Data layer. Each user can only access their own reports, tasks, and streak data. Enforced at the data access layer. Exception: explicitly shared reports are publicly readable.
- Q: What do the library and dashboard show when a new user has no data yet? → A: Friendly empty state with a call-to-action prompt linking to the home screen. No blank pages or misleading zero counters.
- Q: What happens if the user navigates away from the processing screen mid-generation? → A: Pipeline continues server-side. User re-joins progress if they return to the processing URL. A persistent in-app indicator shows active generation on all other pages.
- Q: How does the user navigate between the 5 report sections? → A: Tabbed cards — one tab per section. Action plan tab is visually prominent and either the default active tab or pinned first.
- Q: Where is the streak counter displayed? → A: Persistent — visible in the main navigation or header on every authenticated page.
- Q: What does the home screen show for returning users who already have reports? → A: Submission form prominent at top; 3–5 most recent report cards (title, topic, date) displayed below the form.
- Q: What feedback does the user get when checking off a task? → A: Immediate visual completed style on the task (strikethrough + muted) and real-time streak counter update in the header — no page reload required.

## Assumptions

- The existing boilerplate provides: authentication (Google OAuth + email/password), database
  connection layer, UI component library (shadcn/ui + Tailwind), base layout and routing, and
  AI API integration patterns. These are reused as-is; they are not rebuilt.
- The authentication system (Better Auth) is retained. The boilerplate's `user` table and
  session management are the identity foundation for all LearnAgent data.
- The existing chat interface and diagnostics endpoints from the boilerplate are not part of
  this feature and will be repurposed or removed in a subsequent cleanup pass.
- The AI model used for Analyst, Teacher, and Action Agents is `claude-sonnet-4-6` via the
  Anthropic API directly (not via OpenRouter). The existing OpenRouter integration is for the
  chat feature only.
- Supadata.ai is the primary transcript provider. RapidAPI YouTube Transcript is the fallback.
  Both require API keys added to environment variables.
- Users have stable internet connectivity. Offline support is out of scope for this build.
- The primary user is a technical builder using a desktop browser. Native mobile apps and the
  browser extension are out of scope for this build.
- Email notifications (streak reminders, weekly summaries) are deferred to a follow-up feature.
- All reports are private by default. Sharing is an explicit, user-initiated action.
- There is no team or collaboration tier — all data is single-user.
- Content moderation on project descriptions is out of scope for this build.
- Re-analysis of the same URL is permitted; each submission creates a new report.
