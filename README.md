# LearnAgent

**Submit a YouTube URL + what you're building → get a project-specific action plan in under 90 seconds.**

LearnAgent watches any YouTube tutorial for you, extracts the key concepts, and generates an action plan tailored to your actual project — not a generic summary.

---

## How It Works

1. Paste a YouTube URL and describe what you're currently building
2. A multi-agent pipeline fetches the transcript, analyzes the content, writes a plain-language summary, then crafts tasks that are specific to *your* project
3. A live progress screen streams each step as it completes
4. You get a tabbed report: Action Plan, Core Concept, Key Highlights, Mental Models, Real Examples

The core differentiator is `project_context` — every action plan item must be impossible to write without knowing both the specific video content and your project. Generic tasks are contract violations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router + TypeScript 5.x |
| Package manager | pnpm |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Better Auth (Google OAuth + email/password) |
| Database | PostgreSQL via Drizzle ORM |
| AI agents | `@anthropic-ai/sdk` — `claude-sonnet-4-6` |
| Transcript | Supadata.ai (primary) / RapidAPI YouTube Transcript (fallback) |
| Charts | Recharts |
| Deployment | Vercel |

---

## Local Setup

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Docker (for local PostgreSQL)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp env.example .env.local
```

Fill in `.env.local`:

```env
POSTGRES_URL=postgresql://dev_user:dev_password@localhost:5432/postgres_dev

BETTER_AUTH_SECRET=                 # any random 32-char string
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

ANTHROPIC_API_KEY=                  # claude-sonnet-4-6
SUPADATA_API_KEY=                   # transcript fetching
RAPIDAPI_KEY=                       # optional fallback

ENCRYPTION_KEY=                     # 32-byte hex: openssl rand -hex 32
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Start the database

```bash
docker compose up -d
pnpm db:push
```

### 4. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Commands

```bash
pnpm dev            # Start dev server
pnpm build          # Production build
pnpm typecheck      # TypeScript check
pnpm lint           # ESLint
pnpm check          # lint + typecheck together

pnpm db:push        # Push Drizzle schema to DB (no migration files)
pnpm db:generate    # Generate migration SQL files
pnpm db:migrate     # Run pending migrations
pnpm db:studio      # Open Drizzle Studio at http://localhost:4983
pnpm db:reset       # Drop all tables + push fresh schema
```

---

## Agent Pipeline

```
User Input (YouTube URL + project_context)
           │
           ▼
    ORCHESTRATOR  (src/agents/orchestrator.ts)
    ├─→ FETCHER   → transcript JSON            (no AI — Supadata REST)
    ├─→ ANALYST   → structured analysis JSON   (claude-sonnet-4-6)
    ├─→ TEACHER   → plain markdown summary     (claude-sonnet-4-6)
    └─→ ACTION    ← teacher MD + analyst JSON + project_context
                  → tailored action plan       (claude-sonnet-4-6)
           │
           ▼
    Save to PostgreSQL → return report_id
    SSE events emitted → live progress screen
```

`project_context` is passed to the **Action Agent only**. No other agent sees it.

---

## Project Structure

```
src/
├── agents/
│   ├── orchestrator.ts     # Pipeline coordinator
│   ├── fetcher.ts          # Transcript fetcher (no AI)
│   ├── analyst.ts          # Structured content analysis
│   ├── teacher.ts          # Plain-language summary
│   └── action.ts           # Project-specific action plan
├── app/
│   ├── (app)/
│   │   ├── home/           # URL form + recent reports
│   │   ├── process/[id]/   # SSE progress screen
│   │   ├── report/[id]/    # Tabbed report view
│   │   ├── library/        # Searchable report history
│   │   └── progress/       # Streak + stats dashboard
│   ├── share/[id]/         # Public report (no auth required)
│   └── api/
│       ├── analyze/        # POST pipeline entry + SSE stream
│       ├── reports/        # Report CRUD
│       ├── tasks/[id]/     # Task completion toggle
│       └── streak/         # Current streak
├── components/
│   └── report/             # ConceptTab, HighlightsTab, ModelsTab,
│                           # ExamplesTab, ActionPlanTab
└── lib/
    ├── schema.ts            # Drizzle schema (all 11 tables)
    ├── pipeline-emitter.ts  # SSE EventEmitter map
    ├── validate-url.ts      # YouTube URL → video ID parser
    ├── models/              # Model registry + call abstraction
    └── supadata/            # Transcript API client
```

---

## Database Schema

```
reports         — one row per pipeline run
report_sections — 5 rows per report (concept, highlights, models, examples, actions)
tasks           — action plan tasks, toggleable per user
streaks         — daily learning streak per user
```

Better Auth tables (`user`, `session`, `account`, `verification`) are managed by the auth library — do not modify them.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Random 32-char secret for auth |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `ANTHROPIC_API_KEY` | Yes | Claude API key (sonnet-4-6) |
| `SUPADATA_API_KEY` | Yes | Supadata transcript API key |
| `RAPIDAPI_KEY` | No | RapidAPI fallback for transcripts |
| `ENCRYPTION_KEY` | Yes | 32-byte hex key for user API key encryption |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL (e.g. `http://localhost:3000`) |

---

## Deployment

```bash
vercel --prod
```

Set all required environment variables in the Vercel dashboard before deploying.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → **Credentials** → **OAuth 2.0 Client ID**
3. Set type to **Web application**
4. Add redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://yourdomain.com/api/auth/callback/google` (prod)
5. Copy Client ID and Secret to `.env.local`
