# Contract: /api/reports

---

## GET /api/reports — List User Reports

**Purpose**: Return paginated list of the authenticated user's reports for the Library screen.

**Auth**: Required (cookie or Bearer session)

### Request

```
GET /api/reports?page=1&limit=20&q=<search_term>
```

Query params:
- `page` (optional, default 1)
- `limit` (optional, default 20, max 50)
- `q` (optional) — full-text search against `title` and `project_context`

### Response (200)

```json
{
  "reports": [
    {
      "id": "uuid",
      "video_id": "string",
      "video_url": "string",
      "title": "string",
      "topic_category": "string",
      "estimated_difficulty": "beginner | intermediate | advanced",
      "project_context": "string",
      "status": "pending | processing | complete | failed",
      "created_at": "ISO 8601"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

## GET /api/reports/[id] — Get Full Report

**Purpose**: Return a complete report with all sections and tasks. Used by the Report screen.

**Auth**: Required (must be report owner)

### Response (200)

```json
{
  "id": "uuid",
  "video_id": "string",
  "video_url": "string",
  "title": "string",
  "topic_category": "string",
  "estimated_difficulty": "beginner | intermediate | advanced",
  "project_context": "string",
  "status": "complete",
  "created_at": "ISO 8601",
  "sections": {
    "concept": { "core_concept": "string", "explanation": "string" },
    "highlights": { "items": ["string"] },
    "models": { "items": [{ "name": "string", "description": "string" }] },
    "examples": { "items": ["string"] },
    "actions": {
      "markdown": "string",
      "today": ["string"],
      "week": ["string"],
      "challenge": "string"
    }
  },
  "tasks": [
    {
      "id": "uuid",
      "label": "string",
      "scope": "today | week | month",
      "completed": false,
      "completed_at": null,
      "created_at": "ISO 8601"
    }
  ]
}
```

### Response (404)

```json
{
  "error": "not_found",
  "message": "Report not found."
}
```

### Response (403)

```json
{
  "error": "forbidden",
  "message": "You do not have access to this report."
}
```
