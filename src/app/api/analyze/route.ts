import { headers } from "next/headers";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { runPipeline } from "@/agents/orchestrator";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { extractVideoId } from "@/lib/validate-url";

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: {
    url?: string;
    project_context?: string;
    depth?: string;
    detail_level?: number;
    expertise_level?: string;
    focus?: string;
    reference_url?: string;
    reference_url_type?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { url, project_context, depth, detail_level, expertise_level, focus, reference_url, reference_url_type } = body;

  // Validate depth if provided
  const validDepths = ["quick", "deep", "expert"];
  const resolvedDepth = validDepths.includes(depth ?? "") ? depth! : "deep";

  // Validate detail_level (1-5, default 3)
  const resolvedDetailLevel =
    typeof detail_level === "number" && detail_level >= 1 && detail_level <= 5
      ? Math.round(detail_level)
      : 3;

  // Validate expertise_level
  const validExpertiseLevels = ["beginner", "intermediate", "advanced"];
  const resolvedExpertiseLevel = validExpertiseLevels.includes(expertise_level ?? "")
    ? expertise_level!
    : "intermediate";

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
  const ACTIVE_STATUSES = ["fetching", "analyzing", "researching", "teaching", "planning"] as const;
  const activeReports = await db
    .select({ id: reports.id, createdAt: reports.createdAt, updatedAt: reports.updatedAt })
    .from(reports)
    .where(
      and(
        eq(reports.userId, session.user.id),
        inArray(reports.status, ACTIVE_STATUSES)
      )
    )
    .limit(1);

  if (activeReports.length > 0) {
    const stuck = activeReports[0]!;
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const staleAt = new Date(stuck.updatedAt ?? stuck.createdAt);
    if (staleAt < threeMinutesAgo) {
      // Pipeline crashed (dev restart / Vercel timeout) without setting status to failed — auto-expire
      await db
        .update(reports)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(reports.id, stuck.id));
    } else {
      return NextResponse.json(
        {
          error: "generation_active",
          message: "A report is already being generated. Please wait for it to complete.",
        },
        { status: 409 }
      );
    }
  }

  // 6. Insert new report row
  const inserted = await db
    .insert(reports)
    .values({
      userId: session.user.id,
      videoId,
      videoUrl: url!,
      projectContext: project_context.trim(),
      depth: resolvedDepth,
      detailLevel: resolvedDetailLevel,
      expertiseLevel: resolvedExpertiseLevel,
      focus: focus?.trim() || null,
      referenceUrl: reference_url?.trim() || null,
      referenceUrlType: reference_url_type || null,
      status: "fetching",
    })
    .returning({ id: reports.id });

  const newReport = inserted[0];
  if (!newReport) {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  const pipelineArgs = {
    depth: resolvedDepth,
    detailLevel: resolvedDetailLevel,
    expertiseLevel: resolvedExpertiseLevel,
    focus: focus?.trim() || null,
    referenceUrl: reference_url?.trim() || null,
    referenceUrlType: reference_url_type || null,
  };

  // 7. Continue report generation explicitly after the response is sent.
  // This is more reliable than leaving a detached promise hanging off the request.
  after(async () => {
    try {
      await runPipeline(newReport.id, url!, project_context.trim(), session.user.id, pipelineArgs);
    } catch (err) {
      console.error("[analyze] unhandled pipeline error", err);
    }
  });

  return NextResponse.json({ report_id: newReport.id, status: "fetching" }, { status: 202 });
}
