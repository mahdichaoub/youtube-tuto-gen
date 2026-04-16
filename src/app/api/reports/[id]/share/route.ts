import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (body === null || typeof body.isShared !== "boolean") {
    return NextResponse.json(
      { error: "bad_request", message: "isShared must be a boolean." },
      { status: 400 }
    );
  }

  // Verify ownership
  const existing = await db
    .select({ id: reports.id, userId: reports.userId })
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.userId, session.user.id)))
    .limit(1);

  if (!existing[0]) {
    return NextResponse.json(
      { error: "not_found", message: "Report not found." },
      { status: 404 }
    );
  }

  await db
    .update(reports)
    .set({ isShared: body.isShared, updatedAt: new Date() })
    .where(and(eq(reports.id, id), eq(reports.userId, session.user.id)));

  return NextResponse.json({ id, isShared: body.isShared });
}
