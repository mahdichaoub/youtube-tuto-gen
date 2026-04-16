import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface LibraryReportCardData {
  id: string;
  title: string | null;
  topicCategory: string | null;
  estimatedDifficulty: string | null;
  createdAt: string;
}

interface ReportCardProps {
  report: LibraryReportCardData;
}

export function ReportCard({ report }: ReportCardProps) {
  const createdAtLabel = new Date(report.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link href={`/report/${report.id}`} className="block">
      <Card className="transition-colors hover:border-primary/40 hover:bg-muted/20">
        <CardContent className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-snug">
              {report.title ?? "Untitled video"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{createdAtLabel}</p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {report.topicCategory && (
              <Badge variant="secondary">{report.topicCategory}</Badge>
            )}
            {report.estimatedDifficulty && (
              <Badge variant="outline" className="capitalize">
                {report.estimatedDifficulty}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
