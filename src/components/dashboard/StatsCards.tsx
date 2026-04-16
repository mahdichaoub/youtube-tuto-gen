import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  streak: number;
  totalReports: number;
  totalTasksCompleted: number;
}

export function StatsCards({ streak, totalReports, totalTasksCompleted }: StatsCardsProps) {
  const allZero = streak === 0 && totalReports === 0 && totalTasksCompleted === 0;

  if (allZero) {
    return (
      <Card>
        <CardContent className="space-y-4 px-6 py-8 text-center">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">No activity yet</h2>
            <p className="text-sm text-muted-foreground">
              Generate your first report to start tracking your progress.
            </p>
          </div>
          <Button asChild>
            <Link href="/home">Create a report</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Current Streak
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums">
            {streak > 0 ? `🔥 ${streak}` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">days</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Reports
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{totalReports}</p>
          <p className="mt-1 text-xs text-muted-foreground">completed</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Tasks Done
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{totalTasksCompleted}</p>
          <p className="mt-1 text-xs text-muted-foreground">all time</p>
        </CardContent>
      </Card>
    </div>
  );
}
