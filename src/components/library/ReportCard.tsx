"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export interface LibraryReportCardData {
  id: string;
  videoId: string;
  title: string | null;
  topicCategory: string | null;
  estimatedDifficulty: string | null;
  createdAt: string;
}

interface ReportCardProps {
  report: LibraryReportCardData;
}

function Thumbnail({ videoId }: { videoId: string }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className="flex-shrink-0 rounded-lg flex items-center justify-center"
        style={{
          width: 96, height: 54,
          background: "oklch(0.12 0.01 265)",
          border: "1px solid oklch(0.22 0.008 265)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="oklch(0.4 0.016 265)">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0 rounded-lg overflow-hidden group/thumb" style={{ width: 96, height: 54 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
        alt=""
        width={96}
        height={54}
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
      <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-black/10 transition-colors duration-200 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="white">
            <path d="M2 1.5l4 2.5-4 2.5V1.5z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function ReportCard({ report }: ReportCardProps) {
  const createdAtLabel = new Date(report.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link href={`/report/${report.id}`} className="block group">
      <div
        className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200"
        style={{
          border: "1px solid oklch(0.22 0.008 265)",
          background: "oklch(0.1 0.008 265 / 60%)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.78 0.18 75 / 30%)";
          (e.currentTarget as HTMLElement).style.background = "oklch(0.12 0.01 265 / 80%)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.22 0.008 265)";
          (e.currentTarget as HTMLElement).style.background = "oklch(0.1 0.008 265 / 60%)";
        }}
      >
        <Thumbnail videoId={report.videoId} />

        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-medium leading-snug" style={{ color: "oklch(0.94 0.008 90)" }}>
            {report.title ?? "Untitled video"}
          </p>
          <p className="mt-1 text-[11px] font-mono" style={{ color: "oklch(0.4 0.016 265)" }}>
            {createdAtLabel}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {report.topicCategory && (
            <Badge variant="secondary" className="text-[10px] font-mono">{report.topicCategory}</Badge>
          )}
          {report.estimatedDifficulty && (
            <Badge variant="outline" className="text-[10px] capitalize">{report.estimatedDifficulty}</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
