import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, streaks } from "@/lib/schema";
import { requireAuth } from "@/lib/session";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function yesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session: Awaited<ReturnType<typeof requireAuth>>;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  let body: { completed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof body.completed !== "boolean") {
    return NextResponse.json({ error: "completed must be a boolean" }, { status: 400 });
  }

  // Fetch the task — we need it to check ownership
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  if (!task) {
    return NextResponse.json({ error: "not_found", message: "Task not found." }, { status: 404 });
  }

  if (task.userId !== userId) {
    return NextResponse.json({ error: "forbidden", message: "You do not have access to this task." }, { status: 403 });
  }

  const now = new Date();
  const completedAt = body.completed ? now : null;

  // Update the task
  await db
    .update(tasks)
    .set({ completed: body.completed, completedAt })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

  // Compute streak update (only on completion, not un-completion)
  let streakRow = await db
    .select()
    .from(streaks)
    .where(eq(streaks.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const today = todayUTC();
  const yesterday = yesterdayUTC();

  if (body.completed) {
    if (!streakRow) {
      // First time — insert
      const [inserted] = await db
        .insert(streaks)
        .values({
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: today,
          updatedAt: now,
        })
        .returning();
      streakRow = inserted ?? null;
    } else {
      const last = streakRow.lastActiveDate; // string YYYY-MM-DD or null

      let newCurrent = streakRow.currentStreak;
      if (last === today) {
        // Already active today — no change
      } else if (last === yesterday) {
        newCurrent = streakRow.currentStreak + 1;
      } else {
        // Gap > 1 day — reset
        newCurrent = 1;
      }

      const newLongest = Math.max(streakRow.longestStreak, newCurrent);

      const [updated] = await db
        .update(streaks)
        .set({
          currentStreak: newCurrent,
          longestStreak: newLongest,
          lastActiveDate: today,
          updatedAt: now,
        })
        .where(eq(streaks.userId, userId))
        .returning();
      streakRow = updated ?? null;
    }
  } else if (!streakRow) {
    // No streak row yet — return zeros
    streakRow = { id: "", userId, currentStreak: 0, longestStreak: 0, lastActiveDate: null, updatedAt: now };
  }

  const streak = streakRow ?? { currentStreak: 0, longestStreak: 0, lastActiveDate: null };

  return NextResponse.json({
    id,
    completed: body.completed,
    completedAt: completedAt ? completedAt.toISOString() : null,
    streak: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActiveDate: streak.lastActiveDate,
    },
  });
}
