# Quickstart: LearnAgent MVP

**Purpose**: Step-by-step validation guide. Run through this after each phase completes to
verify the exit condition is met.

---

## Prerequisites

- Node.js 20 LTS installed
- Supabase account + project created
- Anthropic API key
- Supadata API key
- Resend API key (for Phase 7)
- Vercel CLI (for Phase 10)

---

## Setup

```bash
# 1. Navigate to Next.js app root
cd "youtube-tuto"

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local
# Fill in all required values (see CLAUDE.md Environment Variables section)

# 4. Start Supabase local dev
npx supabase start

# 5. Apply migrations
npx supabase db push

# 6. Start development server
npm run dev
```

---

## Phase Exit Condition Checklist

### Phase 1: Database Schema

```bash
# Insert a test report record
curl -X POST http://localhost:3000/api/debug/seed \
  -H "Content-Type: application/json"

# Expected: 201 with inserted record ID
# Then verify SELECT succeeds in Supabase dashboard or via:
npx supabase db inspect
```

Exit condition: All 5 tables exist (`reports`, `report_sections`, `tasks`, `streaks`,
`auth.users` via Supabase). RLS is enabled. Test insert + select succeeds.

---

### Phase 2: Authentication

1. Open http://localhost:3000
2. Navigate to `/login`
3. Sign in with Google OAuth — verify redirect to `/home`
4. Refresh the page — verify session persists (no redirect to login)
5. Sign out — verify redirect to `/login`

Exit condition: Full auth flow works end-to-end. Session persists on refresh.

---

### Phase 3: Agent Pipeline

```bash
# Test with a real YouTube video
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "project_context": "Building a SaaS learning platform with Next.js and Supabase"
  }'

# Expected within 90 seconds:
# { "report_id": "<uuid>", "status": "pending" }

# Then verify the report is complete:
curl http://localhost:3000/api/reports/<report_id> \
  -H "Cookie: <your-session-cookie>"

# Expected: full report with all 5 sections populated, status = "complete"
```

**Contract checks** (verify manually in response):
- `sections.concept.core_concept` — exactly one sentence
- `sections.highlights.items` — 5–7 items, each specific and ≥15 words
- `sections.actions.today` — exactly 3 items, project-specific
- `sections.actions.week` — exactly 3 milestones
- `sections.actions.challenge` — exactly 1 item, video + project specific

Exit condition: Complete contract-valid report returned in <90s.

---

### Phase 4: Home Screen

1. Open http://localhost:3000/home
2. Paste a YouTube URL into the URL field
3. Fill in the project context field (min 10 chars)
4. Submit the form
5. Verify redirect to `/process/<report_id>`

Exit condition: Form submission works; project_context is sent; navigation to process screen
is correct.

---

### Phase 5: Processing Screen

1. Complete Phase 4 submission
2. On `/process/<report_id>`, verify all 4 progress steps animate in sequence
3. Verify automatic navigation to `/report/<report_id>` when pipeline completes

Exit condition: Real-time agent progress visible; automatic navigation on completion.

---

### Phase 6: Report Cards

1. Navigate to `/report/<report_id>`
2. Verify all 5 cards render:
   - Card 1: Core Concept
   - Card 2: Key Highlights (5–7 items)
   - Card 3: Mental Models
   - Card 4: Real Examples
   - Card 5: Action Plan (with project_context label visible)
3. Check a task as complete — verify it persists on refresh

Exit condition: All 5 cards render; project_context label visible on Card 5; task completion
persists in database.

---

### Phase 7: Share, Export, Notifications

```bash
# Test share link (no auth)
curl http://localhost:3000/api/share/<report_id>
# Expected: 200 with report sections (no auth required)
```

1. Open `/share/<report_id>` in incognito — verify renders without login
2. Click "Copy as Markdown" — verify clipboard contains valid Markdown
3. Trigger test email:
```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"type": "test"}'
```

Exit condition: Share link opens without login; Markdown copy produces valid output; test email
delivers.

---

### Phase 8: Library

1. Navigate to `/library`
2. Verify all your past reports appear in the list
3. Use the search bar — verify search filters by title/topic
4. Click a report — verify navigation to `/report/<id>`

Exit condition: Searchable report archive works with real Supabase data.

---

### Phase 9: Progress Dashboard

1. Navigate to `/progress`
2. Verify streak counter shows correct value
3. Verify total reports count matches library
4. Verify Recharts graphs render (no empty state if ≥1 report exists)

Exit condition: All stats render with real Supabase data.

---

### Phase 10: Polish

Full end-to-end pass:
1. Create a new account → sign in → analyze a video → view report → complete tasks
2. Check all UX rules from master.md Section 7.12
3. Verify no internal terminology appears anywhere in the UI (search codebase for "orchestrator",
   "fetcher", "analyst", "teacher", "action agent")
4. Deploy to Vercel: `vercel --prod`
5. Repeat the end-to-end pass on the production URL

Exit condition: Full end-to-end pass; all UX rules verified; no internal terminology in UI.
