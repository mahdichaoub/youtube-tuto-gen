import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getEmitter } from "@/lib/pipeline-emitter";
import type { PipelineEvent } from "@/lib/pipeline-emitter";

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

  // Already complete — emit done immediately
  if (reportRows[0].status === "complete") {
    const body = `data: ${JSON.stringify({ type: "done", report_id: id })}\n\n`;
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
