import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { reports, reportSections } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { HookSection } from "@/components/report/HookSection";
import { BigIdeaSection } from "@/components/report/BigIdeaSection";
import { InsightsSection } from "@/components/report/InsightsSection";
import { ResearchLinksSection } from "@/components/report/ResearchLinksSection";
import { MissionSection } from "@/components/report/MissionSection";
import type { ActionOutput } from "@/components/report/MissionSection";
import type { KeyInsight } from "@/components/report/InsightsSection";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;

  const row = await db
    .select({ title: reports.title, topicCategory: reports.topicCategory })
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.isShared, true)))
    .limit(1);

  if (!row[0]) {
    return { title: "Report not found" };
  }

  const title = row[0].title ?? "Shared Report";
  const description = row[0].topicCategory
    ? `A deep-dive on ${row[0].topicCategory}`
    : "A video learning report";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;

  // Permitted bypass: no userId filter — isShared=true is the guard
  const reportRows = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.isShared, true)))
    .limit(1);

  if (!reportRows[0]) {
    notFound();
  }

  const report = reportRows[0];

  const sectionRows = await db
    .select()
    .from(reportSections)
    .where(eq(reportSections.reportId, id));

  const sections: Record<string, unknown> = {};
  for (const row of sectionRows) {
    sections[row.sectionType] = row.contentJson;
  }

  const concept = sections.concept as
    | {
        hook?: string;
        core_concept: string;
        big_idea_prompt?: string;
        explanation: string;
        why_matters?: string;
        analogy?: string;
        common_mistake?: string;
      }
    | undefined;

  const insights = (
    sections.insights as { items?: KeyInsight[] } | undefined
  )?.items ?? [];

  const actions = sections.actions as ActionOutput | undefined;

  const research = sections.research as
    | {
        concept_articles: { title: string; url: string; summary: string; source_type: string }[];
        project_docs: { title: string; url: string; summary: string; source_type: string }[];
        enriched_explanation: string;
      }
    | undefined;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
      {/* Shared report banner */}
      <div className="text-xs text-muted-foreground text-center border rounded-lg py-2 px-4 bg-muted/30">
        This is a shared report — create your own at{" "}
        <a href="/" className="underline hover:text-foreground">
          LearnAgent
        </a>
      </div>

      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold leading-tight mb-3">
          {report.title ?? "Video Report"}
        </h1>
        <div className="flex flex-wrap gap-2">
          {report.topicCategory && (
            <Badge variant="secondary">{report.topicCategory}</Badge>
          )}
          {report.estimatedDifficulty && (
            <Badge variant="outline" className="capitalize">
              {report.estimatedDifficulty}
            </Badge>
          )}
        </div>
      </div>

      {concept?.why_matters && (
        <HookSection
          whyMatters={concept.why_matters}
          projectContext={report.projectContext}
        />
      )}

      {concept && (
        <BigIdeaSection
          coreConcept={concept.core_concept}
          explanation={concept.explanation}
          {...(concept.big_idea_prompt !== undefined && { bigIdeaPrompt: concept.big_idea_prompt })}
          {...(concept.analogy !== undefined && { analogy: concept.analogy })}
          {...(concept.common_mistake !== undefined && { commonMistake: concept.common_mistake })}
        />
      )}

      {insights.length > 0 && <InsightsSection insights={insights} />}

      {research && <ResearchLinksSection research={research} />}

      {/* Action plan rendered read-only — no task checkboxes */}
      {actions && (
        <MissionSection actions={actions} tasks={[]} readOnly />
      )}
    </div>
  );
}
