import Link from "next/link";
import { eq, and, gte, count } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { reports, tasks, streaks } from "@/lib/schema";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ActivityChart, type ActivityDay } from "@/components/dashboard/ActivityChart";

export default async function ProgressPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  // Query all four data sources in parallel
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

  const [streakRow, reportCountResult, taskCountResult, recentTasks] = await Promise.all([
    db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, userId))
      .limit(1),
    db
      .select({ total: count() })
      .from(reports)
      .where(and(eq(reports.userId, userId), eq(reports.status, "complete"))),
    db
      .select({ total: count() })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.completed, true))),
    db
      .select({ completedAt: tasks.completedAt })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.completed, true),
          gte(tasks.completedAt, thirtyDaysAgo)
        )
      ),
  ]);

  const totalReports = reportCountResult[0]?.total ?? 0;
  const totalTasksCompleted = taskCountResult[0]?.total ?? 0;

  // Apply read-time streak reset (same rule as GET /api/streak)
  let currentStreak = 0;
  if (streakRow[0]) {
    const lastActive = streakRow[0].lastActiveDate;
    if (lastActive) {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);
      const lastActiveDate = new Date(lastActive + "T00:00:00Z");
      currentStreak = lastActiveDate >= yesterday ? streakRow[0].currentStreak : 0;
    }
  }

  // Aggregate completed tasks by UTC date for the 30-day chart
  const countsByDate = new Map<string, number>();
  for (const row of recentTasks) {
    if (!row.completedAt) continue;
    const dateKey = row.completedAt.toISOString().slice(0, 10); // "YYYY-MM-DD"
    countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
  }

  // Build a dense 30-day array with zeros for days with no activity
  const chartData: ActivityDay[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    d.setUTCHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    chartData.push({ date: key, tasksCompleted: countsByDate.get(key) ?? 0 });
  }

  const hasAnyData = totalReports > 0 || totalTasksCompleted > 0;

  if (!hasAnyData) {
    return (
      <div className="mx-auto min-h-screen max-w-3xl px-4 py-10">
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        </div>
        <Card>
          <CardContent className="space-y-4 px-6 py-10 text-center">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Nothing tracked yet</h2>
              <p className="text-sm text-muted-foreground">
                Generate a report and complete some tasks to start seeing your progress here.
              </p>
            </div>
            <Button asChild>
              <Link href="/home">Create your first report</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground">
          Your learning activity at a glance.
        </p>
      </div>

      <div className="space-y-6">
        <StatsCards
          streak={currentStreak}
          totalReports={totalReports}
          totalTasksCompleted={totalTasksCompleted}
        />
        <ActivityChart data={chartData} />
      </div>
    </div>
  );
}
