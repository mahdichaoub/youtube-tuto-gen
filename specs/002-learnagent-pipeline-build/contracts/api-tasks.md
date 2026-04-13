# Contract: PATCH /api/tasks/[id] — Toggle Task Completion

**Purpose**: Mark a task complete or incomplete. Updates streak after every toggle.

**Auth**: Required — user MUST own the task

---

## Request

```
PATCH /api/tasks/[id]
Content-Type: application/json
```

```json
{ "completed": true }
```

or

```json
{ "completed": false }
```

---

## Response (200)

```json
{
  "id": "uuid",
  "completed": true,
  "completedAt": "ISO 8601",
  "streak": {
    "currentStreak": 3,
    "longestStreak": 7,
    "lastActiveDate": "2026-04-13"
  }
}
```

When `completed = false`:

```json
{
  "id": "uuid",
  "completed": false,
  "completedAt": null,
  "streak": {
    "currentStreak": 3,
    "longestStreak": 7,
    "lastActiveDate": "2026-04-13"
  }
}
```

**Streak field**: Always returned so the client can update the header streak counter in real
time without a separate API call (FR-009 real-time streak update requirement).

---

## Side Effects (server-side, atomic)

1. Set `tasks.completed` to the requested value.
2. Set `tasks.completedAt` to `now()` if completing; `null` if uncompleting.
3. Recompute `streaks` row for the user using the streak algorithm defined in `data-model.md`.
4. Return the updated task + new streak values in a single response.

---

## Response (404)

```json
{ "error": "not_found", "message": "Task not found." }
```

## Response (403)

```json
{ "error": "forbidden", "message": "You do not have access to this task." }
```
