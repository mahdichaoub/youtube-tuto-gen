import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reports, reportSections, tasks } from "@/lib/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Authenticate
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Fetch report — userId filter enforced at query level (spec Data Isolation Rule)
  const reportRows = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.userId, session.user.id)))
    .limit(1);

  if (!reportRows[0]) {
    return NextResponse.json(
      { error: "not_found", message: "Report not found." },
      { status: 404 }
    );
  }

  const report = reportRows[0];

  // Fetch sections
  const sectionRows = await db
    .select()
    .from(reportSections)
    .where(eq(reportSections.reportId, id));

  const sections: Record<string, unknown> = {};
  for (const row of sectionRows) {
    sections[row.sectionType] = row.contentJson;
  }

  // Fetch tasks
  const taskRows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.reportId, id), eq(tasks.userId, session.user.id)));

  return NextResponse.json({
    id: report.id,
    videoId: report.videoId,
    videoUrl: report.videoUrl,
    title: report.title,
    topicCategory: report.topicCategory,
    estimatedDifficulty: report.estimatedDifficulty,
    projectContext: report.projectContext,
    status: report.status,
    isShared: report.isShared,
    createdAt: report.createdAt,
    sections,
    tasks: taskRows.map((t) => ({
      id: t.id,
      label: t.label,
      scope: t.scope,
      completed: t.completed,
      completedAt: t.completedAt,
      createdAt: t.createdAt,
      actionIndex: t.actionIndex,
    })),
  });
}
