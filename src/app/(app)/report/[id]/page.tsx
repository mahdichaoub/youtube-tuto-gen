"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { HookSection } from "@/components/report/HookSection";
import { BigIdeaSection } from "@/components/report/BigIdeaSection";
import { InsightsSection } from "@/components/report/InsightsSection";
import { ResearchLinksSection } from "@/components/report/ResearchLinksSection";
import { MissionSection } from "@/components/report/MissionSection";
import type { ActionOutput, TaskItem } from "@/components/report/MissionSection";

interface KeyInsight {
  claim: string;
  example: string;
  mistake: string;
}

interface ResearchData {
  concept_articles: { title: string; url: string; summary: string; source_type: string }[];
  project_docs: { title: string; url: string; summary: string; source_type: string }[];
  enriched_explanation: string;
}

interface ReportData {
  id: string;
  videoId: string;
  videoUrl: string;
  title: string | null;
  topicCategory: string | null;
  estimatedDifficulty: string | null;
  projectContext: string;
  status: string;
  isShared: boolean;
  createdAt: string;
  sections: {
    concept?: {
      hook?: string;
      core_concept: string;
      big_idea_prompt?: string;
      explanation: string;
      why_matters?: string;
    };
    insights?: { items: KeyInsight[] };
    highlights?: { items: string[] };
    actions?: ActionOutput;
    research?: ResearchData;
  };
  tasks: TaskItem[];
}

export default function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((res) => {
        if (res.status === 401) { router.push("/"); return null; }
        if (!res.ok) { router.push("/home"); return null; }
        return res.json();
      })
      .then((data) => { if (data) setReport(data); })
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        <div className="h-8 w-56 bg-muted rounded animate-pulse" />
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!report) return null;

  const { sections, tasks } = report;
  const concept = sections.concept;
  const insights = sections.insights?.items ?? [];
  const actions = sections.actions;
  const research = sections.research;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
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

      {/* 🔥 Why This Matters To You */}
      {concept?.why_matters && (
        <HookSection
          whyMatters={concept.why_matters}
          projectContext={report.projectContext}
        />
      )}

      {/* 💡 The Big Idea */}
      {concept && (
        <BigIdeaSection
          coreConcept={concept.core_concept}
          explanation={concept.explanation}
          bigIdeaPrompt={concept.big_idea_prompt}
        />
      )}

      {/* ⚡ 3 Insights */}
      {insights.length > 0 && (
        <InsightsSection insights={insights} />
      )}

      {/* 🔍 Research Links */}
      {research && (
        <ResearchLinksSection research={research} />
      )}

      {/* 🎯 Mission */}
      {actions && (
        <MissionSection actions={actions} tasks={tasks} />
      )}

      {/* Fallback for old reports without new sections */}
      {!concept?.why_matters && !insights.length && !actions?.hook && (
        <p className="text-xs text-muted-foreground text-center py-4">
          This report was generated before the latest upgrade. Generate a new one to see the full experience.
        </p>
      )}
    </div>
  );
}
