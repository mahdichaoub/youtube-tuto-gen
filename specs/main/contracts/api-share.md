# Contract: GET /api/share/[id]

**Purpose**: Return a complete report for the public share view. No authentication required.
Used by the `/share/[id]` page route.

---

## Request

```
GET /api/share/{report_id}
```

No auth headers required. This endpoint is intentionally public.

---

## Response (200)

Returns a subset of the full report — enough to render the share view. Does NOT include
task completion state (completion is private to the owner).

```json
{
  "id": "uuid",
  "video_url": "string",
  "title": "string",
  "topic_category": "string",
  "estimated_difficulty": "beginner | intermediate | advanced",
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
  }
}
```

**Note**: `project_context` is intentionally excluded from the share response. The action plan
is visible but the user's private project context is not shared publicly.

---

## Response (404)

```json
{
  "error": "not_found",
  "message": "This report is not available."
}
```

Only returned for reports with `status != 'complete'`. Failed or pending reports are not
publicly accessible.

---

## OG Meta Tags

The `/share/[id]` page route uses `generateMetadata()` to produce:

```html
<meta property="og:title" content="LearnAgent: {video_title}" />
<meta property="og:description" content="{core_concept}" />
<meta property="og:url" content="https://learnagent.app/share/{id}" />
```
