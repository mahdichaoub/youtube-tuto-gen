"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ActionOutput {
  markdown: string;
  today: [string, string, string];
  week: [string, string, string];
  challenge: string;
  resources: string[];
  metrics: [string, string, string];
}

export interface TaskItem {
  id: string;
  label: string;
  scope: "today" | "week" | "month";
  completed: boolean;
  completedAt: string | null;
}

interface ActionPlanTabProps {
  actions: ActionOutput;
  tasks: TaskItem[];
  projectContext?: string;
  onTaskToggle?: (taskId: string, newStreak: { currentStreak: number }) => void;
}

function TaskCheckbox({
  task,
  onToggle,
}: {
  task: TaskItem;
  onToggle: (id: string, streak: { currentStreak: number }) => void;
}) {
  const [checked, setChecked] = useState(task.completed);
  const [pending, setPending] = useState(false);

  const handleChange = useCallback(async () => {
    if (pending) return;
    const next = !checked;
    setChecked(next);
    setPending(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: next }),
      });
      if (res.ok) {
        const data = await res.json();
        onToggle(task.id, data.streak);
      } else {
        // Revert on failure
        setChecked(!next);
      }
    } catch {
      setChecked(!next);
    } finally {
      setPending(false);
    }
  }, [checked, pending, task.id, onToggle]);

  return (
    <li className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={pending}
        className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border accent-primary cursor-pointer disabled:cursor-wait"
      />
      <span className={checked ? "line-through text-muted-foreground" : ""}>
        {task.label}
      </span>
    </li>
  );
}

export function ActionPlanTab({
  actions,
  tasks,
  projectContext,
  onTaskToggle,
}: ActionPlanTabProps) {
  const todayTasks = tasks.filter((t) => t.scope === "today");
  const weekTasks = tasks.filter((t) => t.scope === "week");

  const handleToggle = useCallback(
    (taskId: string, streak: { currentStreak: number }) => {
      onTaskToggle?.(taskId, streak);
    },
    [onTaskToggle]
  );

  // Fallback static tasks (no DB ids) are read-only
  const todayList =
    todayTasks.length > 0
      ? todayTasks
      : actions.today.map((label, i) => ({
          id: `today-${i}`,
          label,
          scope: "today" as const,
          completed: false,
          completedAt: null,
        }));

  const weekList =
    weekTasks.length > 0
      ? weekTasks
      : actions.week.map((label, i) => ({
          id: `week-${i}`,
          label,
          scope: "week" as const,
          completed: false,
          completedAt: null,
        }));

  return (
    <div className="space-y-4">
      {projectContext && (
        <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
          Tailored for: <span className="font-medium text-foreground">{projectContext}</span>
        </p>
      )}

      {/* Do Today */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Do Today</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {todayList.map((task) =>
              task.id.startsWith("today-") ? (
                <li key={task.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    readOnly
                    className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border accent-primary cursor-default"
                  />
                  <span>{task.label}</span>
                </li>
              ) : (
                <TaskCheckbox key={task.id} task={task} onToggle={handleToggle} />
              )
            )}
          </ul>
        </CardContent>
      </Card>

      {/* This Week */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {weekList.map((task) =>
              task.id.startsWith("week-") ? (
                <li key={task.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    readOnly
                    className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border accent-primary cursor-default"
                  />
                  <span>{task.label}</span>
                </li>
              ) : (
                <TaskCheckbox key={task.id} task={task} onToggle={handleToggle} />
              )
            )}
          </ul>
        </CardContent>
      </Card>

      {/* 30-Day Challenge */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">30-Day Challenge</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{actions.challenge}</p>
        </CardContent>
      </Card>

      {/* Resources */}
      {actions.resources.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {actions.resources.map((resource, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground">→</span>
                  <span>{resource}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* How to Know It's Working */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How to Know It&apos;s Working</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {actions.metrics.map((metric, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-green-500 font-bold">✓</span>
                <span>{metric}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
