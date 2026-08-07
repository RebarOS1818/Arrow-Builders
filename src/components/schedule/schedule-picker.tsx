"use client";

import { useEffect, useRef } from "react";
import { Check, CalendarOff } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { WeatherIcon, type Condition } from "@/components/ui/weather";
import { dayOfMonth, weekdayLabel } from "@/lib/week";
import { cn } from "@/lib/utils";
import type { TaskWithProject } from "@/lib/types";

/**
 * Scheduling a task without dragging it.
 *
 * The board's week grid is 860px wide and the backlog sits above it on a phone,
 * so a drag between them crosses most of a screen the user cannot see both ends
 * of. This is the same operation as one list of seven days, and it is also the
 * only route a keyboard or a screen reader has — the card is a button, and this
 * is what the button opens.
 *
 * The forecast comes along because it is why a day gets picked. Scheduling a
 * concrete pour into Thursday's rain is the mistake this prevents, and the
 * information is already on the board header three inches away.
 */
export function SchedulePicker({
  task,
  days,
  today,
  weather,
  onPick,
  onClose,
}: {
  task: TaskWithProject;
  days: string[];
  today: string;
  weather: { date: string; high: number; low: number; condition: Condition }[];
  onPick: (date: string | null) => void;
  onClose: () => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  /*
   * Escape, and the opening focus.
   *
   * `Sheet` supplies neither — RecordForm brings its own, which is why this is
   * not inherited. A picker opened from the keyboard that the keyboard cannot
   * then reach or leave would be a trap, and this is the route that exists
   * specifically so a keyboard has one.
   */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);

    // The day the task is already on, so the list opens where the answer is.
    const target =
      listRef.current?.querySelector<HTMLButtonElement>('[aria-current="date"]') ??
      listRef.current?.querySelector<HTMLButtonElement>("button");
    target?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <Sheet open onClose={onClose} label={`Schedule ${task.title}`} className="sm:max-w-md">
      <div className="p-5 pt-2 sm:pt-5">
        <h2 className="text-lg font-semibold tracking-tight">{task.title}</h2>
        <p className="mt-0.5 text-sm text-ink-muted">{task.project.name}</p>

        <ul ref={listRef} className="mt-4 space-y-1">
          {days.map((day) => {
            const forecast = weather.find((w) => w.date === day);
            const current = task.starts_at === day;
            return (
              <li key={day}>
                <button
                  type="button"
                  onClick={() => onPick(day)}
                  aria-current={current ? "date" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-tile px-3 py-2.5 text-left transition-colors",
                    current ? "bg-brand-50 text-brand-800" : "hover:bg-canvas",
                  )}
                >
                  <span className="w-11 shrink-0 text-sm font-semibold">
                    {weekdayLabel(day)}
                  </span>
                  <span className="w-6 shrink-0 text-sm tabular-nums text-ink-muted">
                    {dayOfMonth(day)}
                  </span>

                  {forecast ? (
                    <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <WeatherIcon condition={forecast.condition} className="size-3.5" />
                      {forecast.high}°/{forecast.low}°
                    </span>
                  ) : (
                    <span className="text-xs text-ink-subtle">—</span>
                  )}

                  <span className="ml-auto flex items-center gap-2">
                    {day === today && (
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                        Today
                      </span>
                    )}
                    {current && <Check className="size-4" />}
                  </span>
                </button>
              </li>
            );
          })}

          {/* Only offered when there is something to undo. "Move to
              unscheduled" on a task that is already unscheduled is a button
              that does nothing. */}
          {task.starts_at && (
            <li className="pt-1">
              <button
                type="button"
                onClick={() => onPick(null)}
                className="flex w-full items-center gap-2 rounded-tile border-t border-line px-3 pt-3 pb-2.5 text-left text-sm text-ink-muted hover:text-ink"
              >
                <CalendarOff className="size-4 shrink-0 text-ink-subtle" />
                Move back to unscheduled
              </button>
            </li>
          )}
        </ul>
      </div>
    </Sheet>
  );
}
