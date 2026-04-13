# Feature Specification: LearnAgent MVP

**Feature Branch**: `001-learnagent-mvp`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "LearnAgent MVP — full-stack YouTube-to-action-plan web app with multi-agent AI pipeline"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analyze a Video and Get a Project-Specific Action Plan (Priority: P1)

A developer is building a SaaS product. They find a YouTube video on system design and want
actionable guidance specific to what they are building — not a generic summary. They paste the
video URL, describe their project in a sentence, and receive a structured report with a tailored
action plan: three things to do today, three milestones for the week, and a 30-day challenge
tied directly to their project.

**Why this priority**: This is the core value proposition of LearnAgent. Without this, the
product does not exist. Every other user story depends on this flow completing successfully.

**Independent Test**: Can be fully tested by submitting a YouTube URL and a project description
and verifying the resulting report contains a project-specific action plan. Delivers the
product's primary value independently of all other features.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the home screen, **When** they submit a valid YouTube URL and
   a project description, **Then** they are navigated to a processing screen showing real-time
   progress, and upon completion they are automatically taken to their report.

2. **Given** a completed report, **When** the user reads the action plan, **Then** every action
   item explicitly reflects both the specific video content and the user's stated project — a
   reader who has not seen the video or the project description cannot infer the tasks from
   generic knowledge of the topic alone.

3. **Given** a video with no available transcript, **When** the user submits the URL, **Then**
   they see a clear, friendly error message and are returned to the home screen without losing
   their input.

---

### User Story 2 - Track Task Completion and Maintain a Learning Streak (Priority: P2)

A user returns to a report they generated yesterday. They complete one of the "Do Today" tasks
and check it off. The app records their activity, updates their streak, and shows them how many
consecutive days they have been learning. This visible progress motivates them to return.

**Why this priority**: Task completion and streaks are the primary retention mechanism. Without
them, users have no reason to return after generating a single report.

**Independent Test**: Can be tested by completing tasks on any report and verifying the streak
counter updates. Does not require the library or dashboard to be functional.

**Acceptance Scenarios**:

1. **Given** a user viewing a report, **When** they check off a task, **Then** the task is
   marked complete and remains checked after page refresh and re-login.

2. **Given** a user who completed a task today and a task yesterday, **When** they view their
   streak, **Then** the streak counter shows 2 or more consecutive days.

3. **Given** a user who has not completed any tasks in 48 hours, **When** they view their
   streak, **Then** the streak counter reflects the break and does not continue from the
   previous active period unless activity resumes.

---

### User Story 3 - Share a Report and Export the Action Plan (Priority: P3)

A user generates a report and wants to share it with a colleague who does not have an account.
They copy a shareable link and send it. The colleague opens the link and reads the full report
with no sign-in required. The user also copies the action plan as plain Markdown to paste into
their note-taking app.

**Why this priority**: Sharing drives organic growth and Markdown export adds daily-workflow
value. Both can be built after the core pipeline and task tracking are stable.

**Independent Test**: Can be tested by sharing a report link with an unauthenticated browser
session and verifying the report renders.

**Acceptance Scenarios**:

1. **Given** a user on a report page, **When** they click "Share", **Then** a shareable link
   is copied to their clipboard, and when that link is opened in an incognito window with no
   active session, the full report renders correctly.

2. **Given** a user on a report page, **When** they click "Copy as Markdown", **Then** the
   clipboard contains the action plan formatted as valid Markdown, ready to paste into any
   text editor or note-taking tool.

---

### User Story 4 - Browse and Search Past Reports (Priority: P4)

A user has generated 15 reports over the past month. They want to find the report from a video
about database indexing they watched two weeks ago. They go to their library, type "database",
and find it immediately.

**Why this priority**: The library creates switching costs and makes accumulated value visible.
It is the reason users do not cancel after their first report.

**Independent Test**: Can be tested by generating multiple reports and verifying they appear
in the library with working search.

**Acceptance Scenarios**:

1. **Given** a user with multiple past reports, **When** they navigate to their library,
   **Then** all reports are listed, ordered by most recent first.

2. **Given** a user typing in the search field, **When** they finish typing a term, **Then**
   only reports whose title or topic match the search term are shown, and results update
   without requiring a page reload.

---

### User Story 5 - View Learning Progress on a Dashboard (Priority: P5)

A user wants to see how active they have been. They navigate to the progress dashboard and see
their current streak, total reports generated, total tasks completed, and a chart of their
activity over the past 30 days.

**Why this priority**: The dashboard makes progress tangible and increases motivation to keep
the streak alive. It depends on task completion data being available.

**Independent Test**: Can be tested with real data after at least one report and one completed
task exist.

**Acceptance Scenarios**:

1. **Given** a user who has generated at least one report and completed at least one task,
   **When** they visit the progress dashboard, **Then** all stats (streak, reports count, tasks
   count, activity chart) render with real data — no empty states or placeholder numbers.

---

### Edge Cases

- What happens when the user submits the same YouTube URL twice? The system creates a new
  report — re-analysis is valid because the project description may differ.
- What happens when the video has no English transcript? The system attempts to retrieve an
  auto-generated transcript; if unavailable, it shows a user-friendly error with no
  technical jargon.
- What happens if the user submits an invalid or private YouTube URL? The system validates the
  URL immediately and shows a clear error before starting any processing.
- What happens if report generation takes longer than 90 seconds? The system marks the report
  as failed and shows a retry option with a user-friendly explanation.
- What happens if the user's session expires while the pipeline is running? The pipeline result
  is saved; the user can retrieve the completed report upon re-authentication.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to create an account and sign in using Google or email and password.
- **FR-002**: Users MUST be able to submit a YouTube URL and a project description (minimum 10
  characters) to trigger report generation.
- **FR-003**: The system MUST display real-time progress during report generation with at least
  four distinct, user-friendly progress steps.
- **FR-004**: The system MUST generate a report containing: a core concept, 5–7 key highlights,
  mental models, real examples from the video, and a project-specific action plan.
- **FR-005**: The action plan section MUST contain exactly: 3 immediate tasks, 3 weekly
  milestones, 1 thirty-day challenge, a resource list, and 3 measurable success metrics.
- **FR-006**: Every action item MUST be specific to both the video content and the user's
  project description. Generic tasks that could apply to any video on the same topic are not
  acceptable.
- **FR-007**: Users MUST be able to mark tasks as complete or incomplete. Completion state MUST
  persist across sessions and page refreshes.
- **FR-008**: The system MUST track and display the user's daily learning streak, updated
  whenever a task is completed.
- **FR-009**: Users MUST be able to view all their past reports in a searchable list, filterable
  by title and topic.
- **FR-010**: Users MUST be able to generate a public shareable link for any completed report.
  The linked report MUST be fully readable without requiring a user account.
- **FR-011**: Users MUST be able to copy the action plan section as plain Markdown with a single
  click.
- **FR-012**: Users MUST be able to view a progress dashboard showing their current streak,
  total reports generated, total tasks completed, and a 30-day activity chart.
- **FR-013**: Report generation MUST complete within 90 seconds for any valid YouTube video
  with an available transcript.
- **FR-014**: The system MUST handle all error states (invalid URL, unavailable transcript,
  generation failure) with user-friendly messages that contain no internal technical terminology.

### Key Entities

- **Report**: The primary output. Contains video metadata, topic classification, difficulty
  estimate, and five content sections. Always belongs to one user. Can be shared publicly.
- **Action Plan**: The project-specific section within a report. Contains today's tasks,
  weekly milestones, a 30-day challenge, a resource list, and success metrics. Its content is
  shaped by both the video and the user's project description.
- **Task**: An individual actionable item from the action plan. Has a time scope (today / this
  week / 30-day challenge), a completion state, and a completion timestamp.
- **Project Description**: A free-text string entered by the user before each analysis,
  describing what they are currently building. Stored with the report and used exclusively
  to personalize the action plan.
- **Streak**: A per-user record of consecutive days with at least one completed task. Tracks
  current streak length and all-time longest streak.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can submit a YouTube URL and project description and receive a complete
  learning report within 90 seconds.
- **SC-002**: Every action plan item is verifiably specific to both the video and the user's
  project — a reviewer cannot reverse-engineer the tasks without knowing both inputs.
- **SC-003**: A shared report link loads fully for an unauthenticated visitor within 3 seconds.
- **SC-004**: Task completion state persists correctly 100% of the time across page refreshes
  and re-logins.
- **SC-005**: Library search results appear within 1 second of the user finishing typing.
- **SC-006**: The progress dashboard loads with accurate real data in under 2 seconds for users
  with up to 100 reports.

## Assumptions

- Users have a stable internet connection. Offline support is out of scope for MVP.
- The primary user is an English-speaking developer or technical builder. Multi-language UI
  is out of scope for MVP; transcript language is handled by the transcript provider.
- Mobile browser support is desirable but native mobile apps are out of scope for MVP.
- The browser extension (YouTube sidebar integration) is out of scope for MVP (planned v1.3).
- The intended input method is copy-paste of a YouTube URL from a desktop browser.
- Email notifications (weekly summary, streak reminders) are in scope for MVP but triggered
  manually — automated scheduling is deferred to v2.
- Content moderation on project descriptions is out of scope for MVP.
- All reports are private by default; sharing is an explicit opt-in action by the user.
- There is no team or collaboration tier in MVP — all data is single-user.
- Re-analyzing the same video URL is allowed; each submission creates a new report because the
  project description may differ.
