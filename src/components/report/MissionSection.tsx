"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useStreak } from "@/contexts/StreakContext";

export interface RichTask {
  label: string;
  explanation?: string;
  steps?: string[];
}

export interface ActionOutput {
  hook: string;
  mission_statement: string;
  markdown: string;
  today: [string | RichTask, string | RichTask, string | RichTask];
  week: [string | RichTask, string | RichTask, string | RichTask];
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

function getLabel(task: string | RichTask): string {
  return typeof task === "string" ? task : task.label;
}

function getExpansion(task: string | RichTask): { explanation?: string; steps?: string[] } {
  if (typeof task === "string") return {};
  const result: { explanation?: string; steps?: string[] } = {};
  if (task.explanation !== undefined) result.explanation = task.explanation;
  if (task.steps !== undefined) result.steps = task.steps;
  return result;
}

function TaskRow({
  task,
  richTask,
  onToggle,
  readOnly = false,
}: {
  task: TaskItem;
  richTask: string | RichTask;
  onToggle: (id: string, completed: boolean, streak: { currentStreak: number }) => void;
  readOnly?: boolean;
}) {
  const [checked, setChecked] = useState(task.completed);
  const [pending, setPending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isStatic = task.id.startsWith("today-") || task.id.startsWith("week-");
  const { explanation, steps } = getExpansion(richTask);
  const hasExpansion = explanation || (steps && steps.length > 0);

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
        onToggle(task.id, next, data.streak);
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
    <li className="space-y-1">
      <div className="flex items-start gap-2.5">
        {!readOnly && (
          <input
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            disabled={pending || isStatic}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border accent-green-500 cursor-pointer disabled:cursor-default"
          />
        )}
        <span
          className={`text-sm flex-1 ${checked ? "line-through text-muted-foreground" : "text-foreground/90"}`}
        >
          {getLabel(richTask)}
        </span>
        {hasExpansion && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
            aria-label={expanded ? "Collapse task details" : "Expand task details"}
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          >
            ›
          </button>
        )}
      </div>

      <div
        className="overflow-hidden transition-all duration-200 ml-6"
        style={{ maxHeight: expanded && hasExpansion ? "600px" : "0px" }}
      >
        <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-2 mt-1">
          {explanation && (
            <p className="text-xs text-muted-foreground italic leading-relaxed">
              {explanation}
            </p>
          )}
          {steps && steps.length > 0 && (
            <ol className="space-y-1">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-foreground/80">
                  <span className="font-semibold text-primary flex-shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </li>
  );
}

interface MissionSectionProps {
  actions: ActionOutput;
  tasks: TaskItem[];
  readOnly?: boolean;
}

const DETAIL_LABELS: Record<number, string> = {
  1: "Brief",
  2: "Standard",
  3: "Detailed",
  4: "Deep",
  5: "Expert",
};

export function MissionSection({ actions, tasks, readOnly = false }: MissionSectionProps) {
  const { setCurrentStreak } = useStreak();
  const [detailLevel, setDetailLevel] = useState(3);
  const [savingDetail, setSavingDetail] = useState(false);
  const [detailSaved, setDetailSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Completion tracking for progress bar — starts from DB state
  const [completionMap, setCompletionMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    tasks.forEach((t) => { map[t.id] = t.completed; });
    return map;
  });

  // Load saved detail level on mount
  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((d) => { if (d.detailLevel) setDetailLevel(d.detailLevel); })
      .catch(() => {});
  }, []);

  const handleDetailChange = useCallback(async (level: number) => {
    setDetailLevel(level);
    setSavingDetail(true);
    try {
      await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detailLevel: level }),
      });
      setDetailSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setDetailSaved(false), 2000);
    } catch {
      // best effort
    } finally {
      setSavingDetail(false);
    }
  }, []);

  const todayTasks = tasks.filter((t) => t.scope === "today");
  const weekTasks = tasks.filter((t) => t.scope === "week");

  const todayList =
    todayTasks.length > 0
      ? todayTasks
      : actions.today.map((task, i) => ({
          id: `today-${i}`,
          label: getLabel(task),
          scope: "today" as const,
          completed: false,
          completedAt: null,
        }));

  const weekList =
    weekTasks.length > 0
      ? weekTasks
      : actions.week.map((task, i) => ({
          id: `week-${i}`,
          label: getLabel(task),
          scope: "week" as const,
          completed: false,
          completedAt: null,
        }));

  const handleToggle = useCallback(
    (taskId: string, completed: boolean, streak: { currentStreak: number }) => {
      setCurrentStreak(streak.currentStreak);
      setCompletionMap((prev) => ({ ...prev, [taskId]: completed }));
    },
    [setCurrentStreak]
  );

  // Progress bar — counts all today + week tasks
  const allTaskIds = [...todayList, ...weekList].map((t) => t.id);
  const completedCount = allTaskIds.filter((id) => completionMap[id]).length;
  const totalCount = allTaskIds.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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

      {/* Detail level selector + progress bar — hidden in read-only (shared) view */}
      {!readOnly && (
        <>
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Action detail level
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Applies to your next report
                </p>
              </div>
              {detailSaved && (
                <span className="text-xs text-green-500 font-medium">Saved</span>
              )}
              {savingDetail && !detailSaved && (
                <span className="text-xs text-muted-foreground">Saving…</span>
              )}
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  type="button"
                  key={level}
                  onClick={() => handleDetailChange(level)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                    detailLevel === level
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  <span className="block">{level}</span>
                  <span className="block text-[10px] font-normal opacity-70">{DETAIL_LABELS[level]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card px-5 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Progress
              </p>
              <p className="text-xs text-muted-foreground">
                {completedCount} of {totalCount} tasks
              </p>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">{progressPct}%</p>
          </div>
        </>
      )}

      {/* Today tasks */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Do Today
        </p>
        <ul className="space-y-3">
          {todayList.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              richTask={actions.today.find((t) => getLabel(t) === task.label) ?? task.label}
              onToggle={handleToggle}
              readOnly={readOnly}
            />
          ))}
        </ul>
      </div>

      {/* This Week */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          This Week
        </p>
        <ul className="space-y-3">
          {weekList.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              richTask={actions.week.find((t) => getLabel(t) === task.label) ?? task.label}
              onToggle={handleToggle}
              readOnly={readOnly}
            />
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
