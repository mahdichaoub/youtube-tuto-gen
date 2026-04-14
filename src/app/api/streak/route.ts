import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { streaks } from "@/lib/schema";
import { requireAuth } from "@/lib/session";

function yesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  let session: Awaited<ReturnType<typeof requireAuth>>;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [row] = await db
    .select()
    .from(streaks)
    .where(eq(streaks.userId, userId))
    .limit(1);

  if (!row) {
    return NextResponse.json({ currentStreak: 0, longestStreak: 0, lastActiveDate: null });
  }

  // Read-time reset check: if lastActiveDate is before yesterday, effective streak is 0
  const yesterday = yesterdayUTC();
  const effectiveStreak =
    row.lastActiveDate && row.lastActiveDate < yesterday ? 0 : row.currentStreak;

  return NextResponse.json({
    currentStreak: effectiveStreak,
    longestStreak: row.longestStreak,
    lastActiveDate: row.lastActiveDate,
  });
}
