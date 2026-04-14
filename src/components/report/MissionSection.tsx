"use client";

import { useState, useCallback } from "react";
import { useStreak } from "@/contexts/StreakContext";

export interface ActionOutput {
  hook: string;
  mission_statement: string;
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

function TaskRow({
  task,
  onToggle,
}: {
  task: TaskItem;
  onToggle: (id: string, streak: { currentStreak: number }) => void;
}) {
  const [checked, setChecked] = useState(task.completed);
  const [pending, setPending] = useState(false);
  const isStatic = task.id.startsWith("today-") || task.id.startsWith("week-");

  const handleChange = useCallback(async () => {
    if (pending || isStatic) return;
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
        setChecked(!next);
      }
    } catch {
      setChecked(!next);
    } finally {
      setPending(false);
    }
  }, [checked, pending, task.id, onToggle, isStatic]);

  return (
    <li className="flex items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={pending || isStatic}
        className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border accent-green-500 cursor-pointer disabled:cursor-default"
      />
      <span className={checked ? "line-through text-muted-foreground" : "text-foreground/90"}>
        {task.label}
      </span>
    </li>
  );
}

interface MissionSectionProps {
  actions: ActionOutput;
  tasks: TaskItem[];
}

export function MissionSection({ actions, tasks }: MissionSectionProps) {
  const { setCurrentStreak } = useStreak();

  const todayTasks = tasks.filter((t) => t.scope === "today");
  const weekTasks = tasks.filter((t) => t.scope === "week");

  const handleToggle = useCallback(
    (_taskId: string, streak: { currentStreak: number }) => {
      setCurrentStreak(streak.currentStreak);
    },
    [setCurrentStreak]
  );

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
      {/* Hook */}
      {actions.hook && (
        <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200 mb-2">
            🎯 Your 24h Mission
          </p>
          <p className="text-base font-semibold leading-snug text-white mb-2">
            {actions.mission_statement}
          </p>
          <p className="text-sm leading-relaxed text-emerald-100">{actions.hook}</p>
        </div>
      )}

      {/* Today tasks */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Do Today
        </p>
        <ul className="space-y-2.5">
          {todayList.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={handleToggle} />
          ))}
        </ul>
      </div>

      {/* This Week */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          This Week
        </p>
        <ul className="space-y-2.5">
          {weekList.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={handleToggle} />
          ))}
        </ul>
      </div>

      {/* 30-Day Challenge */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">
          30-Day Challenge
        </p>
        <p className="text-sm leading-relaxed">{actions.challenge}</p>
      </div>

      {/* Resources */}
      {actions.resources.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Resources
          </p>
          <ul className="space-y-1.5">
            {actions.resources.map((resource, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-muted-foreground mt-0.5">→</span>
                <span>{resource}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metrics */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          How to Know It&apos;s Working
        </p>
        <ul className="space-y-2">
          {actions.metrics.map((metric, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-green-500 font-bold mt-0.5">✓</span>
              <span>{metric}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
