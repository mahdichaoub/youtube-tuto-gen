# Contract: PATCH /api/tasks/[id]

**Purpose**: Toggle a task's completion state. Updates `completed`, `completed_at`, and
recomputes the user's streak.

**Auth**: Required (must be task owner)

---

## Request

```
PATCH /api/tasks/{task_id}
Content-Type: application/json
```

```json
{
  "completed": true
}
```

- `completed` (boolean, required) — the new completion state

---

## Response (200)

```json
{
  "id": "uuid",
  "completed": true,
  "completed_at": "2026-03-27T14:00:00Z"
}
```

When `completed = false`:

```json
{
  "id": "uuid",
  "completed": false,
  "completed_at": null
}
```

---

## Streak Side Effect

After every successful PATCH, the server MUST recompute the `streaks` row for the task owner:
- If `completed = true` and `last_active_date < today`: increment `current_streak` by 1,
  update `last_active_date = today`, update `longest_streak` if needed.
- If `completed = true` and `last_active_date = today`: no streak change (already counted today).
- If `completed = false`: no streak adjustment (do not decrement; streaks are additive only).

---

## Response (400)

```json
{
  "error": "invalid_body",
  "message": "completed must be a boolean."
}
```

## Response (404)

```json
{
  "error": "not_found",
  "message": "Task not found."
}
```
