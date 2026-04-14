import { db } from "@/lib/db";
import { reports, reportSections, tasks, userPreferences } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { loadUserModelConfig } from "@/lib/models/client";
import { getEmitter, removeEmitter, emitPipelineEvent } from "@/lib/pipeline-emitter";
import { runFetcher } from "./fetcher";
import { runAnalyst } from "./analyst";
import { runResearcher } from "./researcher";
import { runTeacher } from "./teacher";
import { runAction } from "./action";

export interface PipelineOptions {
  depth?: string | null;
  focus?: string | null;
  referenceUrl?: string | null;
  referenceUrlType?: string | null;
}

/**
 * Orchestrator — the sole relay between agents.
 * Pipeline: Fetcher → Analyst → Researcher → Teacher → Action
 * Emits SSE events for each stage; saves results to DB on completion.
 */
export async function runPipeline(
  reportId: string,
  videoUrl: string,
  projectContext: string,
  userId: string,
  options: PipelineOptions = {}
): Promise<void> {
  const { depth = "deep", focus, referenceUrl, referenceUrlType } = options;

  // Ensure emitter exists before any async work
  getEmitter(reportId);

  const pipeline = async () => {
    // Load model config once
    const modelConfig = await loadUserModelConfig(userId);
    const mc = { ...modelConfig, userId, reportId };

    // Fetch user detail level preference (default 3)
    const prefRow = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });
    const detailLevel = prefRow?.detailLevel ?? 3;

    // ── Step 1: Fetch ──────────────────────────────────────────────────────────
    emitPipelineEvent(reportId, { stage: "fetching", status: "running", progress: 0 });

    const fetcherOutput = await runFetcher(videoUrl);

    await db
      .update(reports)
      .set({ status: "analyzing", updatedAt: new Date() })
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));

    emitPipelineEvent(reportId, { stage: "fetching", status: "complete", progress: 15 });

    // ── Step 2: Analyze ────────────────────────────────────────────────────────
    emitPipelineEvent(reportId, { stage: "analyzing", status: "running", progress: 15 });

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
        status: "researching",
        title: fetcherOutput.title || null,
        topicCategory: analystOutput.topic_category || null,
        estimatedDifficulty: analystOutput.estimated_difficulty || null,
        updatedAt: new Date(),
      })
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));

    emitPipelineEvent(reportId, { stage: "analyzing", status: "complete", progress: 30 });

    // ── Step 3: Research ───────────────────────────────────────────────────────
    emitPipelineEvent(reportId, { stage: "researching", status: "running", progress: 30 });

    let researcherOutput;
    try {
      researcherOutput = await runResearcher(
        analystOutput,
        projectContext,
        referenceUrl,
        referenceUrlType
      );
    } catch (err) {
      // Researcher failure is non-fatal — log and continue without research
      console.error("[orchestrator] researcher failed, continuing without research:", err);
      researcherOutput = undefined;
    }

    await db
      .update(reports)
      .set({ status: "teaching", updatedAt: new Date() })
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));

    emitPipelineEvent(reportId, { stage: "researching", status: "complete", progress: 55 });

    // ── Step 4: Teach ──────────────────────────────────────────────────────────
    emitPipelineEvent(reportId, { stage: "teaching", status: "running", progress: 55 });

    const teacherOutput = await runTeacher(
      fetcherOutput,
      analystOutput,
      mc,
      researcherOutput,
      depth ?? "deep",
      focus,
      referenceUrl,
      referenceUrlType
    );

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

    emitPipelineEvent(reportId, { stage: "teaching", status: "complete", progress: 70 });

    // ── Step 5: Plan ───────────────────────────────────────────────────────────
    emitPipelineEvent(reportId, { stage: "planning", status: "running", progress: 70 });

    const actionOutput = await runAction(
      teacherOutput.markdown,
      analystOutput,
      projectContext,
      mc,
      researcherOutput,
      detailLevel
    );

    if (actionOutput.usedFallback) {
      emitPipelineEvent(reportId, {
        type: "warning",
        message: "Switched to your backup model for this step",
      });
    }

    emitPipelineEvent(reportId, { stage: "planning", status: "complete", progress: 85 });

    // ── Step 6: Save ───────────────────────────────────────────────────────────
    emitPipelineEvent(reportId, { stage: "saving", status: "running", progress: 85 });

    // Build section rows — new Skool-style format
    const sectionRows: { reportId: string; sectionType: string; contentJson: Record<string, unknown> }[] = [
      // concept: big idea + hook + enriched explanation
      {
        reportId,
        sectionType: "concept",
        contentJson: {
          hook: analystOutput.hook,
          core_concept: analystOutput.core_concept,
          big_idea_prompt: analystOutput.big_idea_prompt,
          analogy: analystOutput.analogy,
          common_mistake: analystOutput.common_mistake,
          explanation: (() => {
            const text = teacherOutput.markdown;
            const start = text.indexOf("## 💡 The Big Idea");
            const end = text.indexOf("## ⚡", start);
            if (start === -1) return analystOutput.core_concept;
            return end !== -1
              ? text.slice(start + "## 💡 The Big Idea".length, end).trim()
              : text.slice(start + "## 💡 The Big Idea".length).trim();
          })(),
          why_matters: (() => {
            const text = teacherOutput.markdown;
            const start = text.indexOf("## 🔥 Why This Matters To You");
            const end = text.indexOf("## 💡", start);
            if (start === -1) return "";
            return end !== -1
              ? text.slice(start + "## 🔥 Why This Matters To You".length, end).trim()
              : text.slice(start + "## 🔥 Why This Matters To You".length).trim();
          })(),
        },
      },
      // insights: new 3-insight Skool format
      {
        reportId,
        sectionType: "insights",
        contentJson: {
          items: analystOutput.key_insights,
        },
      },
      // highlights: kept for backward compat
      {
        reportId,
        sectionType: "highlights",
        contentJson: { items: analystOutput.key_highlights },
      },
      // models: mental models
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
      // examples
      {
        reportId,
        sectionType: "examples",
        contentJson: { items: analystOutput.examples_used },
      },
      // actions: mission-style
      {
        reportId,
        sectionType: "actions",
        contentJson: actionOutput.data as unknown as Record<string, unknown>,
      },
    ];

    // Add research section if available
    if (researcherOutput) {
      sectionRows.push({
        reportId,
        sectionType: "research",
        contentJson: {
          concept_articles: researcherOutput.concept_articles,
          project_docs: researcherOutput.project_docs,
          enriched_explanation: researcherOutput.enriched_explanation,
        },
      });
    }

    await db.insert(reportSections).values(sectionRows);

    // Save tasks from action plan
    const taskRows = [
      ...actionOutput.data.today.map((task) => ({
        reportId,
        userId,
        label: task.label,
        scope: "today" as const,
      })),
      ...actionOutput.data.week.map((task) => ({
        reportId,
        userId,
        label: task.label,
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

  // 3-minute hard ceiling (researcher adds time)
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("pipeline_timeout")), 240_000)
  );

  try {
    await Promise.race([pipeline(), timeout]);
  } catch (err) {
    console.error("[orchestrator] pipeline error:", JSON.stringify(err, null, 2), err instanceof Error ? err.stack : "");
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
