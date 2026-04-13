# Quickstart: LearnAgent Pipeline Build

**Purpose**: Step-by-step validation guide. Run through this after each phase completes to
verify the exit condition is met before advancing.

---

## Prerequisites

- Node.js 20 LTS installed
- Docker (for local PostgreSQL via `docker compose up -d`)
- Anthropic API key (`claude-sonnet-4-6` access)
- Supadata API key (get at supadata.ai)
- RapidAPI YouTube Transcript key (fallback — optional for local dev)
- Google OAuth client ID + secret (already configured in boilerplate)

---

## Setup

```bash
# 1. Install dependencies (already done if boilerplate runs)
npm install

# 2. Start local PostgreSQL
docker compose up -d

# 3. Copy and fill environment variables
cp env.example .env.local
# Add to .env.local:
# ANTHROPIC_API_KEY=sk-ant-...
# SUPADATA_API_KEY=...
# RAPIDAPI_KEY=...  (optional fallback)

# 4. Generate and push Drizzle migrations
npm run db:push

# 5. Start dev server
npm run dev
```

---

## Phase Exit Condition Checklist

### Phase 1 (equivalent): Database Schema

```bash
npm run db:studio
# Verify in Drizzle Studio (http://localhost:4983):
# - reports table exists with all columns including status, isShared
# - report_sections table exists
# - tasks table exists
# - streaks table exists
```

Exit condition: All 4 new tables exist with correct schema. Insert a test row via Drizzle
Studio and verify it appears. RLS enabled on all tables.

---

### Phase 2 (equivalent): Authentication

1. Open http://localhost:3000
2. Navigate to `/login`
3. Sign in with Google OAuth — verify redirect to `/home`
4. Refresh — verify session persists
5. Sign out — verify redirect to `/login`

Exit condition: Full auth flow works. Session persists on refresh.

---

### Phase 3: Agent Pipeline

```bash
# Sign in first and get session cookie from browser DevTools
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-better-auth-session-cookie>" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "project_context": "Building a SaaS learning platform with Next.js and Drizzle ORM"
  }'

# Expected: { "report_id": "<uuid>", "status": "fetching" }

# Subscribe to SSE stream (in a second terminal)
curl -N "http://localhost:3000/api/analyze/<report_id>/stream" \
  -H "Cookie: <session-cookie>"
# Watch 10 stage events stream through, ending with {"type":"done","report_id":"..."}

# Verify completed report
curl http://localhost:3000/api/reports/<report_id> \
  -H "Cookie: <session-cookie>"
# Expected: full report, status = "complete", all 5 sections present
```

**Contract checks** (verify manually):
- `sections.concept.core_concept` — exactly one sentence
- `sections.highlights.items` — 5–7 specific items
- `sections.actions.today` — exactly 3 project-specific tasks
- `sections.actions.week` — exactly 3 milestones
- `sections.actions.challenge` — exactly 1 item (video + project specific)
- `sections.actions.metrics` — exactly 3 items

Exit condition: Complete, contract-valid report returned in <90s.

---

### Phase 4: Home Screen

1. Open http://localhost:3000/home
2. Verify the URL submission form is visible and prominent
3. If reports exist, verify 3–5 recent report cards appear below the form
4. Fill in a YouTube URL and project context (≥10 chars) and submit
5. Verify redirect to `/process/<report_id>`

Exit condition: Form submits with both fields; navigates to processing screen.

---

### Phase 5: Processing Screen

1. Complete Phase 4 submission
2. On `/process/<report_id>`:
   - Verify 5 progress steps render with user-friendly labels (NOT raw stage names)
   - Verify each step animates as the SSE stream advances
   - Verify automatic navigation to `/report/<report_id>` on completion
3. Open `/process/<report_id>` in a new tab while generation is running — verify it re-joins
   the live stream at the current stage

Exit condition: 5 user-friendly progress steps visible; auto-navigation on completion;
reconnect to in-progress stream works.

---

### Phase 6: Report Screen

1. Navigate to `/report/<report_id>`
2. Verify 5 tabs render: Concept, Highlights, Mental Models, Examples, Action Plan
3. Verify Action Plan tab is the default active tab or pinned first
4. On Action Plan tab, verify project context label is visible
5. Check a task as complete:
   - Verify immediate visual style change (strikethrough + muted)
   - Verify streak counter in header updates in real time
   - Refresh page — verify task remains checked

Exit condition: All 5 tabs render; task completion persists; streak updates in real time.

---

### Phase 7: Share + Export

```bash
# Toggle sharing on
curl -X POST http://localhost:3000/api/reports/<report_id>/share \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"isShared": true}'
# Expected: { "id": "...", "isShared": true }
```

1. Open `/share/<report_id>` in a private/incognito window — verify full report renders
   with no login prompt
2. Click "Copy as Markdown" — paste into a text editor and verify valid Markdown

```bash
# Toggle sharing off
curl -X POST http://localhost:3000/api/reports/<report_id>/share \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"isShared": false}'

# Verify link is now inaccessible
curl http://localhost:3000/api/share/<report_id>
# Expected: 404
```

Exit condition: Share link accessible when `isShared = true`; returns 404 when `false`;
Markdown copy produces valid output.

---

### Phase 8: Library

1. Navigate to `/library`
2. Verify all completed reports appear, most recent first
3. Type a search term — verify results filter without page reload
4. Click a report card — verify navigation to `/report/<id>`
5. Verify empty state prompt when no reports exist (new account test)

Exit condition: Searchable library works with real data; empty state renders correctly.

---

### Phase 9: Progress Dashboard

1. Navigate to `/progress`
2. Verify streak counter shows correct current streak
3. Verify total reports count matches library count
4. Verify total tasks completed count is accurate
5. Verify 30-day activity chart renders (no empty state if ≥1 task completed)
6. Verify streak counter in header matches dashboard streak value

Exit condition: All 4 metrics render with real data in under 2 seconds.

---

### Phase 10: Polish

Full end-to-end pass:

1. Create a new account → sign in → analyze a video → view report → complete all tasks
2. Share a report → open in incognito → verify → revoke share → verify 404
3. Search library → navigate to report → check streak in header
4. View dashboard — all metrics accurate

**Internal terminology scan**:
```bash
# Search codebase — NONE of these must appear in any UI-visible string
grep -r "orchestrator\|fetcher\|analyst\|teacher\|action agent\|relay pattern" src/app src/components
# Expected: 0 matches in UI text, labels, placeholders, error messages
```

5. Deploy to Vercel: `vercel --prod`
6. Repeat end-to-end pass on production URL

Exit condition: Full pass complete; zero internal terms in UI; production deployment verified.
