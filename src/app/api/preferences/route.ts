import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await requireAuth();
  const row = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, session.user.id),
  });
  return NextResponse.json({ detailLevel: row?.detailLevel ?? 3 });
}

export async function PATCH(req: Request) {
  const session = await requireAuth();
  const body = await req.json();
  const level = Number(body.detailLevel);
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    return NextResponse.json({ error: "detailLevel must be 1–5" }, { status: 400 });
  }

  await db
    .insert(userPreferences)
    .values({ userId: session.user.id, detailLevel: level })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { detailLevel: level, updatedAt: new Date() },
    });

  return NextResponse.json({ detailLevel: level });
}
