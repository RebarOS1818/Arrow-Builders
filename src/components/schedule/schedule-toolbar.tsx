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
      <div className="flex items-center gap-0.5 rounded-full bg-surface p-1 shadow-soft">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setParams({ view: item.id === "calendar" ? null : item.id })}
            aria-pressed={view === item.id}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              view === item.id
                ? "bg-brand-700 text-white"
                : "text-ink-muted hover:bg-canvas hover:text-ink",
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
          className="pressable grid size-9 place-items-center rounded-full bg-surface text-ink-muted shadow-soft hover:text-ink"
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
            "rounded-full bg-surface px-4 py-2 text-sm font-medium shadow-soft",
            weekStart === todayWeekStart
              ? "cursor-not-allowed text-ink-subtle"
              : "pressable text-ink-muted hover:text-ink",
          )}
        >
          Today
        </button>
        <button
          type="button"
          aria-label="Next week"
          onClick={() => setParams({ week: addDays(weekStart, 7) })}
          className="pressable grid size-9 place-items-center rounded-full bg-surface text-ink-muted shadow-soft hover:text-ink"
        >
          <ChevronRight className="size-4" />
        </button>
        <span className="grid size-9 place-items-center rounded-full bg-surface text-ink-muted shadow-soft">
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
          className="pressable flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
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
        className="cursor-pointer appearance-none rounded-full bg-surface py-2.5 pl-4 pr-9 text-sm font-medium text-ink-muted shadow-soft outline-none transition-shadow hover:text-ink hover:shadow-lift focus:ring-2 focus:ring-brand-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
    </div>
  );
}
