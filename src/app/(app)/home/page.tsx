"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RecentReport {
  id: string;
  title: string | null;
  topicCategory: string | null;
  createdAt: string;
}

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [projectContext, setProjectContext] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);

  useEffect(() => {
    fetch("/api/reports?limit=5&status=complete")
      .then((r) => r.json())
      .then((data) => {
        if (data.reports) setRecentReports(data.reports);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError("Please enter a YouTube URL.");
      return;
    }
    if (projectContext.trim().length < 10) {
      setError("Please describe what you're building (at least 10 characters).");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), project_context: projectContext.trim() }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError("A report is already being generated. Please wait for it to complete.");
        return;
      }

      if (!res.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
        return;
      }

      router.push(`/process/${data.report_id}`);
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Learn faster. Build sooner.</h1>
          <p className="text-muted-foreground">
            Paste any YouTube video and describe what you&apos;re building — get a project-specific action plan in under 90 seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="url">YouTube Video URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">What are you currently building?</Label>
            <Textarea
              id="context"
              placeholder="e.g. A SaaS app for freelancers that tracks invoices and sends reminders..."
              rows={3}
              value={projectContext}
              onChange={(e) => setProjectContext(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Be specific — the more context you give, the more useful your action plan will be.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Starting..." : "Generate Action Plan"}
          </Button>
        </form>

        {recentReports.length > 0 && (
          <div className="mt-12">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Recent Reports
            </h2>
            <div className="space-y-3">
              {recentReports.map((report) => (
                <Card
                  key={report.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/report/${report.id}`)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug line-clamp-1">
                        {report.title ?? "Untitled video"}
                      </p>
                      {report.topicCategory && (
                        <Badge variant="secondary" className="flex-shrink-0 text-xs">
                          {report.topicCategory}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
