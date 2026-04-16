"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export interface ActivityDay {
  date: string;
  tasksCompleted: number;
}

interface ActivityChartProps {
  data: ActivityDay[];
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

export function ActivityChart({ data }: ActivityChartProps) {
  const allZero = data.every((d) => d.tasksCompleted === 0);

  if (allZero) {
    return (
      <Card>
        <CardContent className="space-y-4 px-6 py-8 text-center">
          <div className="space-y-2">
            <h2 className="text-base font-semibold">No activity in the last 30 days</h2>
            <p className="text-sm text-muted-foreground">
              Complete tasks to start building your activity streak.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/home">Create a report</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    date: formatDateLabel(d.date),
    tasks: d.tasksCompleted,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Tasks Completed — Last 30 Days
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(chartData.length / 6)}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value) => [value, "Tasks"]}
            />
            <Bar dataKey="tasks" radius={[3, 3, 0, 0]} className="fill-primary" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
