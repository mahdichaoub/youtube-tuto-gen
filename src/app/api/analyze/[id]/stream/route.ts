import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEmitter } from "@/lib/pipeline-emitter";
import type { PipelineEvent } from "@/lib/pipeline-emitter";
import { reports } from "@/lib/schema";
import { STAGE_ORDER as SSE_STAGE_ORDER } from "@/lib/sse-labels";

// Lifecycle stages (excludes the "complete" display stage — that's a UI-only state)
const STAGE_ORDER = SSE_STAGE_ORDER.filter((s) => s !== "complete") as readonly string[] as readonly ["fetching", "analyzing", "researching", "teaching", "planning", "saving"];

function buildInitialEvents(status: string, id: string): PipelineEvent[] | null {
  if (status === "complete" || status === "partial") {
    return [{ type: "done", report_id: id }];
  }

  if (status === "failed") {
    return [{ type: "error", message: "We couldn't process this video. Please try again." }];
  }

  const stageIndex = STAGE_ORDER.indexOf(status as (typeof STAGE_ORDER)[number]);
  if (stageIndex === -1) {
    return null;
  }

  const events: PipelineEvent[] = [];
  for (const [index, stage] of STAGE_ORDER.entries()) {
    if (index < stageIndex) {
      events.push({
        stage,
        status: "complete",
        progress: Math.round(((index + 1) / STAGE_ORDER.length) * 100),
      });
      continue;
    }

    if (index === stageIndex) {
      events.push({
        stage,
        status: "running",
        progress: Math.round((index / STAGE_ORDER.length) * 100),
      });
    }
  }

  return events;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Authenticate
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const reportRows = await db
    .select({ status: reports.status })
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.userId, session.user.id)))
    .limit(1);

  if (!reportRows[0]) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const initialEvents = buildInitialEvents(reportRows[0].status, id);
  const immediateEvent = initialEvents?.length === 1 ? initialEvents[0] : null;
  if (immediateEvent && "type" in immediateEvent) {
    const body = `data: ${JSON.stringify(immediateEvent)}\n\n`;
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Stream events
  const emitter = getEmitter(id);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      for (const event of initialEvents ?? []) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      const onEvent = (event: PipelineEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          if ("type" in event && (event.type === "done" || event.type === "error")) {
            controller.close();
          }
        } catch {
          // Client disconnected
        }
      };

      emitter.on("event", onEvent);

      // Clean up on client disconnect
      req.signal.addEventListener("abort", () => {
        emitter.off("event", onEvent);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
