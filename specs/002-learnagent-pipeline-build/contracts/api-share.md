# Contract: GET /api/share/[id] — Public Report Access

**Purpose**: Return a full report for unauthenticated public access. Used by `app/share/[id]/page.tsx`.

**Auth**: None required. If the report exists and `isShared = true`, it is returned. Otherwise 404.

---

## Request

```
GET /api/share/[id]
```

No auth headers or session cookies required or checked.

---

## Response (200)

```json
{
  "id": "uuid",
  "videoId": "string",
  "videoUrl": "string",
  "title": "string",
  "topicCategory": "string",
  "estimatedDifficulty": "beginner | intermediate | advanced",
  "projectContext": "string",
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
  }
}
```

**Note**: Tasks are NOT included in the public share response. Task completion is a
private, per-user concern.

**Note**: `userId` is NOT included in the response — the owner's identity is never exposed.

---

## Response (404)

Returned when:
- The report ID does not exist, OR
- The report exists but `isShared = false`

```json
{ "error": "not_found", "message": "This report is not available." }
```

A 404 (not a 403) is returned in both cases to avoid leaking whether a report ID exists.

---

## GET /api/streak — Current User Streak

**Purpose**: Returns the authenticated user's current streak for header display.

**Auth**: Required

### Response (200)

```json
{
  "currentStreak": 5,
  "longestStreak": 12,
  "lastActiveDate": "2026-04-13"
}
```

If the user has no streak record yet (no tasks ever completed):

```json
{
  "currentStreak": 0,
  "longestStreak": 0,
  "lastActiveDate": null
}
```
