# Contract: POST /api/analyze + GET /api/analyze/[id]/stream

**Purpose**: Pipeline entry point and SSE progress stream.

---

## POST /api/analyze — Start Pipeline

**Auth**: Required (Better Auth session cookie)

### Request

```
POST /api/analyze
Content-Type: application/json
```

```json
{
  "url": "string (required) — any valid YouTube URL format",
  "project_context": "string (required) — what the user is currently building (min 10 chars)"
}
```

**Validation**:
- `url` MUST contain a valid 11-char YouTube video ID
- `project_context` MUST be non-empty and ≥10 chars after trim
- User MUST be authenticated — 401 if no valid session
- User MUST NOT have another generation in status `fetching | analyzing | teaching | planning` — 409 if active generation exists

### Response (202 Accepted)

```json
{
  "report_id": "uuid",
  "status": "fetching"
}
```

Pipeline starts immediately server-side. Client subscribes to SSE stream to track progress.

### Response (400 Bad Request)

```json
{ "error": "invalid_url", "message": "Please provide a valid YouTube video URL." }
```
```json
{ "error": "missing_context", "message": "Please describe what you are currently building." }
```

### Response (401 Unauthorized)

```json
{ "error": "unauthorized", "message": "Please sign in to analyze a video." }
```

### Response (409 Conflict)

```json
{ "error": "generation_active", "message": "A report is already being generated. Please wait for it to complete." }
```

### Response (500 Pipeline Failure)

```json
{ "error": "pipeline_failed", "message": "We couldn't process this video. Please try again." }
```

---

## GET /api/analyze/[id]/stream — SSE Progress Stream

**Purpose**: Streams pipeline progress for a given report. Client re-attaches to this stream
if they navigate away and return to the processing screen.

**Auth**: Required — user MUST own the report

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### Events Emitted (in order)

```
data: {"stage":"fetching","status":"running","progress":0}
data: {"stage":"fetching","status":"complete","progress":20}
data: {"stage":"analyzing","status":"running","progress":20}
data: {"stage":"analyzing","status":"complete","progress":40}
data: {"stage":"teaching","status":"running","progress":40}
data: {"stage":"teaching","status":"complete","progress":60}
data: {"stage":"planning","status":"running","progress":60}
data: {"stage":"planning","status":"complete","progress":80}
data: {"stage":"saving","status":"running","progress":80}
data: {"stage":"saving","status":"complete","progress":100}
data: {"type":"done","report_id":"<uuid>"}
```

On failure:
```
data: {"type":"error","message":"<user-facing message — no internal terms>"}
```

If client connects to a stream for an already-completed report:
```
data: {"type":"done","report_id":"<uuid>"}
```

### UI Label Map (REQUIRED — never display raw `stage` value)

| Stage value | Display text |
|---|---|
| `fetching` | Reading the video |
| `analyzing` | Analyzing the content |
| `teaching` | Writing your summary |
| `planning` | Crafting your action plan |
| `saving` | Saving your report |

### Response (404) — Report not found or not owned by user

```json
{ "error": "not_found", "message": "Report not found." }
```
