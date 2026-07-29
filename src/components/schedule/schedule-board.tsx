"use client";

import { useMemo, useState, useTransition } from "react";
import { Flag, Plus } from "lucide-react";
import { WeatherIcon, type Condition } from "@/components/ui/weather";
import { ScheduleTaskCard, type CrewMember } from "@/components/schedule/task-card";
import { scheduleTask } from "@/app/(app)/schedule/actions";
import { cn } from "@/lib/utils";
import { dayOfMonth, rangeLabel, spanColumns, weekDays, weekdayLabel } from "@/lib/week";
import type { Milestone, TaskWithProject } from "@/lib/types";

type MilestoneWithProject = Milestone & { project: { id: string; name: string } };

export function ScheduleBoard({
  tasks,
  milestones,
  crewByTask,
  weekStart,
  today,
  weather,
}: {
  tasks: TaskWithProject[];
  milestones: MilestoneWithProject[];
  crewByTask: Record<string, CrewMember[]>;
  weekStart: string;
  today: string;
  weather: { date: string; high: number; low: number; condition: Condition }[];
}) {
  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  const [, startTransition] = useTransition();

  /**
   * Moves are held locally rather than in `useOptimistic`: without Supabase
   * configured there is no server write to reconcile against, and an optimistic
   * value would snap back the moment the transition settled. Once the database
   * revalidates, the override simply matches what the server already returned.
   */
  const [moves, setMoves] = useState<Record<string, string | null>>({});

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);

  const currentTasks = useMemo(
    () =>
      tasks.map((task) => {
        if (!(task.id in moves)) return task;
        const date = moves[task.id]!;
        return {
          ...task,
          starts_at: date,
          ends_at: date,
          status: date ? ("scheduled" as const) : ("unscheduled" as const),
        };
      }),
    [tasks, moves],
  );

  const unscheduled = currentTasks.filter((t) => !t.starts_at);
  const byDay = (day: string) => currentTasks.filter((t) => t.starts_at === day);

  function move(taskId: string, date: string | null) {
    setMoves((prev) => ({ ...prev, [taskId]: date }));
    startTransition(async () => {
      await scheduleTask(taskId, date);
    });
  }

  function onDrop(event: React.DragEvent, date: string | null) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/task-id") || draggingId;
    setHoverDay(null);
    setDraggingId(null);
    if (taskId) move(taskId, date);
  }

  const dragProps = (taskId: string) => ({
    onDragStart: (event: React.DragEvent) => {
      event.dataTransfer.setData("text/task-id", taskId);
      event.dataTransfer.effectAllowed = "move";
      setDraggingId(taskId);
    },
    onDragEnd: () => {
      setDraggingId(null);
      setHoverDay(null);
    },
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Unscheduled backlog */}
      <section
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDrop(e, null)}
        className="card flex max-h-[70vh] flex-col p-3"
      >
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">Unscheduled ({unscheduled.length})</h2>
          <button
            type="button"
            aria-label="Expand unscheduled list"
            className="text-ink-subtle hover:text-ink"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <div className="scroll-thin mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {unscheduled.map((task) => (
            <ScheduleTaskCard
              key={task.id}
              task={task}
              crew={crewByTask[task.id] ?? []}
              compact
              dragging={draggingId === task.id}
              {...dragProps(task.id)}
            />
          ))}

          {unscheduled.length === 0 && (
            <p className="px-1 py-6 text-center text-xs text-ink-muted">
              Everything is scheduled.
            </p>
          )}
        </div>

        <button
          type="button"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong py-2 text-xs font-medium text-ink-muted hover:border-brand-400 hover:text-brand-700"
        >
          <Plus className="size-3.5" />
          Add Unscheduled Task
        </button>
      </section>

      {/* Week grid */}
      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-2.5">
          <p className="text-sm font-semibold">{rangeLabel(weekStart, days[6]!)}</p>
        </div>

        <div className="scroll-thin overflow-x-auto">
          <div className="min-w-[860px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-line">
              {days.map((day) => {
                const forecast = weather.find((w) => w.date === day);
                return (
                  <div
                    key={day}
                    className={cn(
                      "px-3 py-2",
                      day === today && "bg-brand-50/60",
                      day !== days[0] && "border-l border-line",
                    )}
                  >
                    <p className="text-xs font-semibold">
                      {weekdayLabel(day)}{" "}
                      <span className="text-ink-muted">{dayOfMonth(day)}</span>
                    </p>
                    {forecast && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <WeatherIcon condition={forecast.condition} className="size-3.5" />
                        <span className="text-[11px] text-ink-muted">
                          {forecast.high}°/{forecast.low}°
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Milestone band */}
            {milestones.length > 0 && (
              <div className="grid grid-cols-7 gap-y-1.5 border-b border-line px-1 py-2">
                {milestones.map((milestone) => {
                  const span = spanColumns(milestone.starts_at, milestone.ends_at, weekStart);
                  if (!span) return null;
                  return (
                    <div
                      key={milestone.id}
                      style={{ gridColumnStart: span.start, gridColumnEnd: span.end }}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs",
                        milestone.trade === "concrete"
                          ? "bg-orange-50 text-orange-900 ring-1 ring-orange-200"
                          : "bg-brand-50 text-brand-800 ring-1 ring-brand-200",
                      )}
                    >
                      <Flag className="size-3.5 shrink-0" />
                      <span className="truncate font-medium">
                        {milestone.title} — {milestone.project.name}
                      </span>
                      <span className="ml-auto hidden shrink-0 text-[11px] opacity-70 sm:block">
                        {rangeLabel(milestone.starts_at, milestone.ends_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Day columns */}
            <div className="grid min-h-[380px] grid-cols-7">
              {days.map((day) => (
                <div
                  key={day}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoverDay(day);
                  }}
                  onDragLeave={() => setHoverDay((d) => (d === day ? null : d))}
                  onDrop={(e) => onDrop(e, day)}
                  className={cn(
                    "space-y-2 p-2 transition-colors",
                    day !== days[0] && "border-l border-line",
                    day === today && "bg-brand-50/40",
                    hoverDay === day && "bg-brand-50",
                  )}
                >
                  {byDay(day).map((task) => (
                    <ScheduleTaskCard
                      key={task.id}
                      task={task}
                      crew={crewByTask[task.id] ?? []}
                      dragging={draggingId === task.id}
                      {...dragProps(task.id)}
                    />
                  ))}

                  {draggingId && byDay(day).length === 0 && (
                    <div className="grid h-16 place-items-center rounded-lg border border-dashed border-brand-300 text-[11px] font-medium text-brand-700">
                      Drag to schedule
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
