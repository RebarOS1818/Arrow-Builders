"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GanttChartSquare,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays } from "@/lib/week";

export type ScheduleView = "board" | "calendar" | "timeline";

const VIEWS: { id: ScheduleView; label: string; icon: React.ElementType }[] = [
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "timeline", label: "Timeline", icon: GanttChartSquare },
];

export function ScheduleToolbar({
  view,
  weekStart,
  todayWeekStart,
  projects,
  crews,
}: {
  view: ScheduleView;
  weekStart: string;
  todayWeekStart: string;
  projects: { id: string; name: string }[];
  crews: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?", { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setParams({ view: item.id === "calendar" ? null : item.id })}
            aria-pressed={view === item.id}
            className={cn(
              "flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-sm font-medium transition-colors",
              view === item.id
                ? "bg-canvas text-ink shadow-xs"
                : "text-ink-muted hover:text-ink",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => setParams({ week: addDays(weekStart, -7) })}
          className="grid size-8 place-items-center rounded-lg border border-line bg-surface text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setParams({ week: null })}
          // Already on this week, so the click would change nothing. Disabled
          // rather than inert, which is indistinguishable from broken.
          disabled={weekStart === todayWeekStart}
          className={cn(
            "rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium",
            weekStart === todayWeekStart
              ? "cursor-not-allowed text-ink-subtle"
              : "text-ink-muted hover:text-ink",
          )}
        >
          Today
        </button>
        <button
          type="button"
          aria-label="Next week"
          onClick={() => setParams({ week: addDays(weekStart, 7) })}
          className="grid size-8 place-items-center rounded-lg border border-line bg-surface text-ink-muted hover:text-ink"
        >
          <ChevronRight className="size-4" />
        </button>
        <span className="grid size-8 place-items-center rounded-lg border border-line bg-surface text-ink-muted">
          <CalendarRange className="size-4" />
        </span>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Select
          ariaLabel="Project filter"
          value={searchParams.get("project") ?? "all"}
          onChange={(v) => setParams({ project: v === "all" ? null : v })}
          options={[{ value: "all", label: "All Projects" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
        />
        <Select
          ariaLabel="Crew filter"
          value={searchParams.get("crew") ?? "all"}
          onChange={(v) => setParams({ crew: v === "all" ? null : v })}
          options={[{ value: "all", label: "All Crews" }, ...crews.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <button
          type="button"
          onClick={() => setParams({ create: "1", view: null })}
          className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Create Task
        </button>
      </div>
    </div>
  );
}

function Select({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-line bg-surface py-2 pl-3 pr-8 text-sm font-medium text-ink-muted outline-none hover:text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
    </div>
  );
}
