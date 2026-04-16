"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HookSection } from "@/components/report/HookSection";
import { BigIdeaSection } from "@/components/report/BigIdeaSection";
import { InsightsSection } from "@/components/report/InsightsSection";
import { ResearchLinksSection } from "@/components/report/ResearchLinksSection";
import { MissionSection } from "@/components/report/MissionSection";
import type { ActionOutput, TaskItem } from "@/components/report/MissionSection";
import type { KeyInsight } from "@/components/report/InsightsSection";

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
      analogy?: string;
      common_mistake?: string;
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
  const [isShared, setIsShared] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState(false);
  const [sharingPending, setSharingPending] = useState(false);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((res) => {
        if (res.status === 401) { router.push("/"); return null; }
        if (!res.ok) { router.push("/home"); return null; }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setReport(data);
          setIsShared(data.isShared ?? false);
        }
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleShareToggle = useCallback(async (enable: boolean) => {
    setSharingPending(true);
    try {
      const res = await fetch(`/api/reports/${id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isShared: enable }),
      });
      if (res.ok) {
        setIsShared(enable);
        if (enable) {
          const shareUrl = `${window.location.origin}/share/${id}`;
          await navigator.clipboard.writeText(shareUrl).catch(() => {});
          setShareToast("Link copied to clipboard!");
        } else {
          setShareToast("Sharing disabled.");
        }
        setTimeout(() => setShareToast(null), 3000);
      }
    } finally {
      setSharingPending(false);
    }
  }, [id]);

  const handleCopyMarkdown = useCallback(async () => {
    if (!report?.sections.actions?.markdown) return;
    await navigator.clipboard.writeText(report.sections.actions.markdown).catch(() => {});
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 3000);
  }, [report]);

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
        <div className="flex flex-wrap items-center gap-2">
          {report.topicCategory && (
            <Badge variant="secondary">{report.topicCategory}</Badge>
          )}
          {report.estimatedDifficulty && (
            <Badge variant="outline" className="capitalize">
              {report.estimatedDifficulty}
            </Badge>
          )}
          <div className="flex-1" />
          {actions?.markdown && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyMarkdown}
              className="text-xs"
            >
              {copyToast ? "Copied!" : "Copy as Markdown"}
            </Button>
          )}
          {isShared ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShareToggle(false)}
              disabled={sharingPending}
              className="text-xs"
            >
              Disable sharing
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShareToggle(true)}
              disabled={sharingPending}
              className="text-xs"
            >
              Share
            </Button>
          )}
        </div>

        {/* Toast feedback */}
        {shareToast && (
          <p className="text-xs text-muted-foreground mt-2">{shareToast}</p>
        )}
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
          {...(concept.big_idea_prompt !== undefined && { bigIdeaPrompt: concept.big_idea_prompt })}
          {...(concept.analogy !== undefined && { analogy: concept.analogy })}
          {...(concept.common_mistake !== undefined && { commonMistake: concept.common_mistake })}
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
