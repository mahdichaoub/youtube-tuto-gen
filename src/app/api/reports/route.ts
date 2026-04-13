import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { eq, and, ilike, or, desc, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const q = searchParams.get("q")?.trim();
  const offset = (page - 1) * limit;

  // Build filters
  const userFilter = eq(reports.userId, session.user.id);
  const statusFilter = eq(reports.status, "complete");

  const filters = q
    ? and(
        userFilter,
        statusFilter,
        or(
          ilike(reports.title, `%${q}%`),
          ilike(reports.topicCategory, `%${q}%`)
        )
      )
    : and(userFilter, statusFilter);

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: reports.id,
        videoId: reports.videoId,
        videoUrl: reports.videoUrl,
        title: reports.title,
        topicCategory: reports.topicCategory,
        estimatedDifficulty: reports.estimatedDifficulty,
        projectContext: reports.projectContext,
        status: reports.status,
        isShared: reports.isShared,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(filters)
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(reports)
      .where(filters),
  ]);

  return NextResponse.json({
    reports: rows,
    total: totalResult[0]?.total ?? 0,
    page,
    limit,
  });
}
