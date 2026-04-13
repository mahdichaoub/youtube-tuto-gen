# Contract: /api/reports

---

## GET /api/reports — List User Reports (Library)

**Auth**: Required (Better Auth session cookie)

### Request

```
GET /api/reports?page=1&limit=20&q=<search_term>
```

Query params:
- `page` (optional, default 1)
- `limit` (optional, default 20, max 50)
- `q` (optional) — searches `title` and `topic_category` (case-insensitive, partial match)

### Response (200)

```json
{
  "reports": [
    {
      "id": "uuid",
      "videoId": "string",
      "videoUrl": "string",
      "title": "string",
      "topicCategory": "string",
      "estimatedDifficulty": "beginner | intermediate | advanced",
      "projectContext": "string",
      "status": "complete",
      "isShared": false,
      "createdAt": "ISO 8601"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

Results are ordered by `createdAt DESC` (most recent first).
Only `status = "complete"` reports are returned in library listings.

---

## GET /api/reports/[id] — Get Full Report

**Auth**: Required — user MUST own the report (or report must be shared for public access
via `/share/[id]` page — handled separately)

### Response (200)

```json
{
  "id": "uuid",
  "videoId": "string",
  "videoUrl": "string",
  "title": "string",
  "topicCategory": "string",
  "estimatedDifficulty": "beginner | intermediate | advanced",
  "projectContext": "string",
  "status": "complete",
  "isShared": false,
  "createdAt": "ISO 8601",
  "sections": {
    "concept":    { "core_concept": "string", "explanation": "string" },
    "highlights": { "items": ["string"] },
    "models":     { "items": [{ "name": "string", "description": "string" }] },
    "examples":   { "items": ["string"] },
    "actions":    {
      "markdown":  "string",
      "today":     ["string"],
      "week":      ["string"],
      "challenge": "string",
      "resources": ["string"],
      "metrics":   ["string"]
    }
  },
  "tasks": [
    {
      "id": "uuid",
      "label": "string",
      "scope": "today | week | month",
      "completed": false,
      "completedAt": null,
      "createdAt": "ISO 8601"
    }
  ]
}
```

### Response (404)

```json
{ "error": "not_found", "message": "Report not found." }
```

### Response (403)

```json
{ "error": "forbidden", "message": "You do not have access to this report." }
```

---

## POST /api/reports/[id]/share — Toggle Sharing

**Auth**: Required — user MUST own the report

### Request

```json
{ "isShared": true }
```

### Response (200)

```json
{ "id": "uuid", "isShared": true }
```

When `isShared` is set to `true`, the report becomes publicly accessible at `/share/[id]`.
When set to `false`, the `/share/[id]` route returns 404 immediately.
