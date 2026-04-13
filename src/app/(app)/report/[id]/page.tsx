import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ConceptTab } from "@/components/report/ConceptTab";
import { HighlightsTab } from "@/components/report/HighlightsTab";
import { ModelsTab } from "@/components/report/ModelsTab";
import { ExamplesTab } from "@/components/report/ExamplesTab";
import { ActionPlanTab } from "@/components/report/ActionPlanTab";
import type { ActionOutput, TaskItem } from "@/components/report/ActionPlanTab";

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
    concept?: { core_concept: string; explanation: string };
    highlights?: { items: string[] };
    models?: { items: Array<{ name: string; description: string }> };
    examples?: { items: string[] };
    actions?: ActionOutput;
  };
  tasks: TaskItem[];
}

async function getReport(id: string): Promise<ReportData | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/reports/${id}`, {
    headers: { cookie: (await headers()).get("cookie") ?? "" },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const report = await getReport(id);
  if (!report) notFound();

  const { sections, tasks } = report;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold leading-tight mb-2">
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

        {/* Tabs */}
        <Tabs defaultValue="actions">
          <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="actions">Action Plan</TabsTrigger>
            <TabsTrigger value="concept">Core Concept</TabsTrigger>
            <TabsTrigger value="highlights">Key Highlights</TabsTrigger>
            <TabsTrigger value="models">Mental Models</TabsTrigger>
            <TabsTrigger value="examples">Real Examples</TabsTrigger>
          </TabsList>

          <TabsContent value="actions">
            {sections.actions ? (
              <ActionPlanTab
                actions={sections.actions}
                tasks={tasks}
                projectContext={report.projectContext}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Action plan not available.</p>
            )}
          </TabsContent>

          <TabsContent value="concept">
            {sections.concept ? (
              <ConceptTab concept={sections.concept} />
            ) : (
              <p className="text-sm text-muted-foreground">Content not available.</p>
            )}
          </TabsContent>

          <TabsContent value="highlights">
            {sections.highlights ? (
              <HighlightsTab highlights={sections.highlights} />
            ) : (
              <p className="text-sm text-muted-foreground">Content not available.</p>
            )}
          </TabsContent>

          <TabsContent value="models">
            {sections.models ? (
              <ModelsTab models={sections.models} />
            ) : (
              <p className="text-sm text-muted-foreground">Content not available.</p>
            )}
          </TabsContent>

          <TabsContent value="examples">
            {sections.examples ? (
              <ExamplesTab examples={sections.examples} />
            ) : (
              <p className="text-sm text-muted-foreground">Content not available.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
