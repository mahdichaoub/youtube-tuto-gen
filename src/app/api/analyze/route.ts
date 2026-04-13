import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { extractVideoId } from "@/lib/validate-url";
import { runPipeline } from "@/agents/orchestrator";

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: { url?: string; project_context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { url, project_context } = body;

  // 3. Validate URL
  const videoId = extractVideoId(url ?? "");
  if (!videoId) {
    return NextResponse.json(
      { error: "invalid_url", message: "Please provide a valid YouTube video URL." },
      { status: 400 }
    );
  }

  // 4. Validate project context
  if (!project_context || project_context.trim().length < 10) {
    return NextResponse.json(
      {
        error: "missing_context",
        message: "Please describe what you are currently building.",
      },
      { status: 400 }
    );
  }

  // 5. Check for in-progress generation
  const activeReports = await db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        eq(reports.userId, session.user.id),
        inArray(reports.status, ["fetching", "analyzing", "teaching", "planning"])
      )
    )
    .limit(1);

  if (activeReports.length > 0) {
    return NextResponse.json(
      {
        error: "generation_active",
        message: "A report is already being generated. Please wait for it to complete.",
      },
      { status: 409 }
    );
  }

  // 6. Insert new report row
  const inserted = await db
    .insert(reports)
    .values({
      userId: session.user.id,
      videoId,
      videoUrl: url!,
      projectContext: project_context.trim(),
      status: "fetching",
    })
    .returning({ id: reports.id });

  const newReport = inserted[0];
  if (!newReport) {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  // 7. Fire-and-forget pipeline
  runPipeline(newReport.id, url!, project_context.trim(), session.user.id).catch(
    (err) => {
      console.error("[analyze] unhandled pipeline error", err);
    }
  );

  return NextResponse.json({ report_id: newReport.id, status: "fetching" }, { status: 202 });
}
