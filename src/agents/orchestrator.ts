import { db } from "@/lib/db";
import { reports, reportSections, tasks } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { loadUserModelConfig } from "@/lib/models/client";
import { getEmitter, removeEmitter, emitPipelineEvent } from "@/lib/pipeline-emitter";
import { runFetcher } from "./fetcher";
import { runAnalyst } from "./analyst";
import { runTeacher } from "./teacher";
import { runAction } from "./action";

/**
 * Orchestrator — the sole relay between agents.
 * Calls loadUserModelConfig once, then runs the 4-agent pipeline sequentially.
 * Emits SSE events for each stage; saves results to DB on completion.
 * Wraps the entire pipeline in a 90-second hard timeout (FR-008).
 */
export async function runPipeline(
  reportId: string,
  videoUrl: string,
  projectContext: string,
  userId: string
): Promise<void> {
  // Ensure emitter exists before any async work
  getEmitter(reportId);

  const pipeline = async () => {
    // Load model config once
    const modelConfig = await loadUserModelConfig(userId);
    const mc = { ...modelConfig, userId, reportId };

    // ── Step 1: Fetch ──────────────────────────────────────────────────────────
    emitPipelineEvent(reportId, { stage: "fetching", status: "running", progress: 0 });

    const fetcherOutput = await runFetcher(videoUrl);

    await db
      .update(reports)
      .set({ status: "analyzing", updatedAt: new Date() })
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));

    emitPipelineEvent(reportId, { stage: "fetching", status: "complete", progress: 20 });

    // ── Step 2: Analyze ────────────────────────────────────────────────────────
    emitPipelineEvent(reportId, { stage: "analyzing", status: "running", progress: 20 });

    const analystOutput = await runAnalyst(fetcherOutput, mc);

    if (analystOutput.usedFallback) {
      emitPipelineEvent(reportId, {
        type: "warning",
        message: "Switched to your backup model for this step",
      });
    }

    await db
      .update(reports)
      .set({
        status: "teaching",
        title: fetcherOutput.title || null,
        topicCategory: analystOutput.topic_category || null,
        estimatedDifficulty: analystOutput.estimated_difficulty || null,
        updatedAt: new Date(),
      })
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));

    emitPipelineEvent(reportId, { stage: "analyzing", status: "complete", progress: 40 });

    // ── Step 3: Teach ──────────────────────────────────────────────────────────
    emitPipelineEvent(reportId, { stage: "teaching", status: "running", progress: 40 });

    const teacherOutput = await runTeacher(fetcherOutput, analystOutput, mc);

    if (teacherOutput.usedFallback) {
      emitPipelineEvent(reportId, {
        type: "warning",
        message: "Switched to your backup model for this step",
      });
    }

    await db
      .update(reports)
      .set({ status: "planning", updatedAt: new Date() })
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));

    emitPipelineEvent(reportId, { stage: "teaching", status: "complete", progress: 60 });

    // ── Step 4: Plan ───────────────────────────────────────────────────────────
    emitPipelineEvent(reportId, { stage: "planning", status: "running", progress: 60 });

    const actionOutput = await runAction(
      teacherOutput.markdown,
      analystOutput,
      projectContext,
      mc
    );

    if (actionOutput.usedFallback) {
      emitPipelineEvent(reportId, {
        type: "warning",
        message: "Switched to your backup model for this step",
      });
    }

    emitPipelineEvent(reportId, { stage: "planning", status: "complete", progress: 80 });

    // ── Step 5: Save ───────────────────────────────────────────────────────────
    emitPipelineEvent(reportId, { stage: "saving", status: "running", progress: 80 });

    // Save 5 report sections
    const sectionRows = [
      {
        reportId,
        sectionType: "concept",
        contentJson: {
          core_concept: analystOutput.core_concept,
          explanation: teacherOutput.markdown
            .split("## 🧠 What This Is Really About")[1]
            ?.split("##")[0]
            ?.trim() ?? analystOutput.core_concept,
        },
      },
      {
        reportId,
        sectionType: "highlights",
        contentJson: { items: analystOutput.key_highlights },
      },
      {
        reportId,
        sectionType: "models",
        contentJson: {
          items: analystOutput.mental_models.map((m) => ({
            name: m.split(":")[0]?.trim() ?? m,
            description: m.split(":").slice(1).join(":").trim() || m,
          })),
        },
      },
      {
        reportId,
        sectionType: "examples",
        contentJson: { items: analystOutput.examples_used },
      },
      {
        reportId,
        sectionType: "actions",
        contentJson: actionOutput.data,
      },
    ];

    await db.insert(reportSections).values(sectionRows);

    // Save tasks from action plan
    const taskRows = [
      ...actionOutput.data.today.map((label) => ({
        reportId,
        userId,
        label,
        scope: "today" as const,
      })),
      ...actionOutput.data.week.map((label) => ({
        reportId,
        userId,
        label,
        scope: "week" as const,
      })),
    ];

    if (taskRows.length > 0) {
      await db.insert(tasks).values(taskRows);
    }

    // Mark report complete
    await db
      .update(reports)
      .set({ status: "complete", updatedAt: new Date() })
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));

    emitPipelineEvent(reportId, { stage: "saving", status: "complete", progress: 100 });
    emitPipelineEvent(reportId, { type: "done", report_id: reportId });
    removeEmitter(reportId);
  };

  // 90-second hard ceiling (FR-008)
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("pipeline_timeout")), 90_000)
  );

  try {
    await Promise.race([pipeline(), timeout]);
  } catch (err) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as { code: string }).code
        : null;
    const isModelError = code === "model_failed" || code === "all_models_failed";
    const isTimeout = err instanceof Error && err.message === "pipeline_timeout";

    let message: string;
    if (isModelError) {
      message = "We couldn't reach the AI model. Please check your model settings and try again.";
    } else if (isTimeout) {
      message = "This video is taking too long to process. Please try again.";
    } else {
      message = "We couldn't process this video. Please try again.";
    }

    try {
      await db
        .update(reports)
        .set({ status: "failed", updatedAt: new Date() })
        .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));
    } catch {
      // DB update failure is secondary — still emit error to client
    }

    emitPipelineEvent(reportId, { type: "error", message });
    removeEmitter(reportId);
  }
}
