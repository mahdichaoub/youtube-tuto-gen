import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/schema";
import { requireAuth } from "@/lib/session";

export async function GET() {
  let session: Awaited<ReturnType<typeof requireAuth>>;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const row = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, session.user.id),
  });
  return NextResponse.json({ detailLevel: row?.detailLevel ?? 3 });
}

export async function PATCH(req: Request) {
  let session: Awaited<ReturnType<typeof requireAuth>>;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

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
