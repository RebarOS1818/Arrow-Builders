import { Suspense } from "react";
import { RefreshCw } from "lucide-react";
import { ScheduleBoard } from "@/components/schedule/schedule-board";
import { ScheduleToolbar, type ScheduleView } from "@/components/schedule/schedule-toolbar";
import { TaskBoard } from "@/components/schedule/task-board";
import { TaskTimeline } from "@/components/schedule/task-timeline";
import { TRADE_DOT, TRADE_LABELS } from "@/components/ui/badge";
import { demoWeather } from "@/lib/demo-data";
import { getMilestones, getProjects, getTasks, getTeam, getToday } from "@/lib/data";
import type { Trade } from "@/lib/types";
import { startOfWeek } from "@/lib/week";

export const dynamic = "force-dynamic";

const TRADES = Object.keys(TRADE_LABELS) as Trade[];

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; view?: string; project?: string; crew?: string }>;
}) {
  const params = await searchParams;

  const [projects, tasks, milestones, team, today] = await Promise.all([
    getProjects(),
    getTasks(),
    getMilestones(),
    getTeam(),
    getToday(),
  ]);

  const todayWeekStart = startOfWeek(today);
  const weekStart = params.week ? startOfWeek(params.week) : todayWeekStart;
  const view: ScheduleView =
    params.view === "board" || params.view === "timeline" ? params.view : "calendar";

  const projectFilter = params.project && params.project !== "all" ? params.project : null;
  const crewFilter = params.crew && params.crew !== "all" ? params.crew : null;

  // Crews are modelled as trades — the way a scheduler groups labour on site.
  const crewOptions = TRADES.map((trade) => ({ id: trade, name: `${TRADE_LABELS[trade]} Crew` }));

  const visibleTasks = tasks.filter(
    (t) =>
      (!projectFilter || t.project_id === projectFilter) && (!crewFilter || t.trade === crewFilter),
  );
  const visibleMilestones = milestones.filter(
    (m) => !projectFilter || m.project_id === projectFilter,
  );

  /**
   * Crew assignment is derived from trade until per-task assignment lands:
   * trade specialists lead, generalists fill the rest of the crew.
   */
  const crewByTask = Object.fromEntries(
    visibleTasks.map((task) => [
      task.id,
      [...team]
        .sort((a, b) => Number(b.trade === task.trade) - Number(a.trade === task.trade))
        .slice(0, Math.max(1, Math.min(task.crew_size, 4)))
        .map(({ id, full_name, initials }) => ({ id, full_name, initials })),
    ]),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Tasks &amp; Schedule</h1>

      <Suspense>
        <ScheduleToolbar
          view={view}
          weekStart={weekStart}
          todayWeekStart={todayWeekStart}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          crews={crewOptions}
        />
      </Suspense>

      {view === "calendar" && (
        <ScheduleBoard
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          tasks={visibleTasks}
          milestones={visibleMilestones}
          crewByTask={crewByTask}
          weekStart={weekStart}
          today={today}
          weather={demoWeather}
        />
      )}

      {view === "board" && <TaskBoard tasks={visibleTasks} crewByTask={crewByTask} />}

      {view === "timeline" && (
        <TaskTimeline
          projects={projectFilter ? projects.filter((p) => p.id === projectFilter) : projects}
          tasks={visibleTasks}
          milestones={visibleMilestones}
          weekStart={weekStart}
          today={today}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <ul className="flex flex-wrap items-center gap-4">
          {TRADES.map((trade) => (
            <li key={trade} className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span className={`size-2 rounded-full ${TRADE_DOT[trade]}`} />
              {TRADE_LABELS[trade]}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span>
            Showing {visibleTasks.length} of {tasks.length} tasks
          </span>
          <RefreshCw className="size-3.5" />
        </div>
      </div>
    </div>
  );
}
