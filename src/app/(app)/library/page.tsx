"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReportCard, type LibraryReportCardData } from "@/components/library/ReportCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ReportsResponse {
  reports: Array<
    LibraryReportCardData & {
      videoId: string;
      videoUrl: string;
      projectContext: string;
      status: string;
      isShared: boolean;
    }
  >;
  total: number;
  page: number;
  limit: number;
}

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [reports, setReports] = useState<LibraryReportCardData[]>([]); // videoId included via ReportsResponse
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReports() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ limit: "50" });
        if (debouncedQuery) {
          params.set("q", debouncedQuery);
        }

        const res = await fetch(`/api/reports?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("Failed to load reports");
        }

        const data = (await res.json()) as ReportsResponse;
        setReports(data.reports);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setError("We couldn't load your reports. Please try again.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadReports();

    return () => controller.abort();
  }, [debouncedQuery]);

  const showEmptyState = !loading && reports.length === 0 && !debouncedQuery && !error;
  const showSearchEmptyState = !loading && reports.length === 0 && !!debouncedQuery && !error;

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Library</h1>
        <p className="text-sm text-muted-foreground">
          Browse your past reports and find the one you need fast.
        </p>
      </div>

      <div className="mb-6">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or topic"
          aria-label="Search reports"
        />
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-4 py-3 rounded-xl" style={{ border: "1px solid oklch(0.22 0.008 265)", background: "oklch(0.1 0.008 265 / 60%)" }}>
              <div className="flex-shrink-0 rounded-lg animate-pulse bg-muted" style={{ width: 96, height: 54 }} />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="px-5 py-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {showEmptyState && (
        <Card>
          <CardContent className="space-y-4 px-6 py-8 text-center">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">No reports yet</h2>
              <p className="text-sm text-muted-foreground">
                Generate your first report to start building your learning library.
              </p>
            </div>
            <Button asChild>
              <Link href="/home">Create a report</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {showSearchEmptyState && (
        <Card>
          <CardContent className="px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">No reports match your search.</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
