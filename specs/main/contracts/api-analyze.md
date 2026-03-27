# Contract: POST /api/analyze

**Purpose**: Pipeline entry point. Accepts a YouTube URL and project context, starts the
multi-agent pipeline asynchronously, and returns a report ID for polling/streaming.

---

## Request

```
POST /api/analyze
Content-Type: application/json
Authorization: Bearer <supabase-session-token>  (or cookie-based session)
```

```json
{
  "url": "string (required) — any valid YouTube URL format",
  "project_context": "string (required) — what the user is currently building (min 10 chars)"
}
```

**Validation**:
- `url` MUST contain a valid YouTube video ID (11-char alphanumeric + `-_`)
- `project_context` MUST be non-empty and ≥10 chars after trim
- User MUST be authenticated; 401 if no valid session

---

## Response (Success — 202 Accepted)

```json
{
  "report_id": "uuid",
  "status": "pending"
}
```

The pipeline runs asynchronously. Client MUST subscribe to the SSE stream at
`GET /api/analyze/{report_id}/stream` to track agent progress.

---

## SSE Stream: GET /api/analyze/[report_id]/stream

**Note**: This is a companion endpoint to the analyze POST. It streams pipeline progress.

```
Content-Type: text/event-stream
Cache-Control: no-cache
```

**Events emitted**:

```
data: {"agent":"fetcher","status":"running","progress":0}
data: {"agent":"fetcher","status":"complete","progress":25}
data: {"agent":"analyst","status":"running","progress":25}
data: {"agent":"analyst","status":"complete","progress":50}
data: {"agent":"teacher","status":"running","progress":50}
data: {"agent":"teacher","status":"complete","progress":75}
data: {"agent":"action","status":"running","progress":75}
data: {"agent":"action","status":"complete","progress":100}
data: {"type":"done","report_id":"<uuid>"}
```

On failure:
```
data: {"type":"error","message":"<user-facing message — no internal terms>"}
```

**UI rule**: The `agent` field MUST NOT be displayed verbatim in the UI. The processing screen
maps agent names to user-facing labels:
- `fetcher` → "Reading the video"
- `analyst` → "Analyzing the content"
- `teacher` → "Building your summary"
- `action` → "Crafting your action plan"

---

## Response (Error — 400 Bad Request)

```json
{
  "error": "invalid_url",
  "message": "Please provide a valid YouTube video URL."
}
```

```json
{
  "error": "missing_context",
  "message": "Please describe what you are currently building."
}
```

**Response (Error — 401 Unauthorized)**:
```json
{
  "error": "unauthorized",
  "message": "Please sign in to analyze a video."
}
```

**Response (Error — 500 — pipeline failure)**:
```json
{
  "error": "pipeline_failed",
  "message": "We couldn't process this video. Please try again."
}
```
