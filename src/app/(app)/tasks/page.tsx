import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, ListChecks } from "lucide-react";
import { ClickableRow } from "@/components/phases/clickable-row";
import { EditTaskForm } from "@/components/phases/edit-forms";
import { NewTaskForm } from "@/components/tasks/new-task-form";
import { ClearFilters } from "@/components/ui/clear-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterSelect } from "@/components/ui/filter-select";
import { TRADE_LABELS, TradeDot } from "@/components/ui/badge";
import { getBuildings, getProjects, getTasks } from "@/lib/data";
import { cn, formatShortDate } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<TaskStatus, string> = {
  unscheduled: "Unscheduled",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

const STATUS_TONE: Record<TaskStatus, string> = {
  unscheduled: "bg-canvas text-ink-muted",
  scheduled: "bg-sky-50 text-sky-700",
  in_progress: "bg-amber-50 text-amber-800",
  blocked: "bg-rose-50 text-rose-700",
  done: "bg-brand-50 text-brand-700",
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; status?: string }>;
}) {
  const params = await searchParams;

  const [tasks, projects, buildings] = await Promise.all([
    getTasks(),
    getProjects(),
    getBuildings(),
  ]);

  // Every building across the portfolio; the edit form narrows to the ones on
  // the task's own project, which is the only set the database accepts.
  const buildingChoices = buildings.map((b) => ({
    id: b.id,
    name: b.name,
    project_id: b.project_id,
  }));

  const projectFilter = params.project && params.project !== "all" ? params.project : null;
  const statusFilter = params.status && params.status !== "all" ? params.status : null;

  const visible = tasks.filter(
    (t) =>
      (!projectFilter || t.project_id === projectFilter) && (!statusFilter || t.status === statusFilter),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {visible.length} of {tasks.length} tasks
            {tasks.some((t) => t.overdue) && (
              <>
                {" · "}
                <span className="font-medium text-status-behind-ink">
                  {tasks.filter((t) => t.overdue).length} overdue
                </span>
              </>
            )}
          </p>
        </div>

        <Suspense>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              ariaLabel="Project filter"
              param="project"
              className="w-48"
              options={[
                { value: "all", label: "All Projects" },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
            <FilterSelect
              ariaLabel="Status filter"
              param="status"
              className="w-40"
              options={[
                { value: "all", label: "All Statuses" },
                ...(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => ({
                  value: s,
                  label: STATUS_LABELS[s],
                })),
              ]}
            />
            <NewTaskForm projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
          </div>
        </Suspense>
      </div>

      <div className="card scroll-thin overflow-x-auto">
        <table role="table" className="stacked-table w-full min-w-[720px] text-sm">
          <thead role="rowgroup">
            <tr role="row" className="border-b border-line text-left text-xs font-semibold text-ink-muted">
              <th role="columnheader" className="px-4 py-3">Task</th>
              <th role="columnheader" className="px-4 py-3">Project</th>
              <th role="columnheader" className="px-4 py-3">Trade</th>
              <th role="columnheader" className="px-4 py-3">Status</th>
              <th role="columnheader" className="px-4 py-3">Crew</th>
              <th role="columnheader" className="px-4 py-3 text-right">Scheduled</th>
              <th role="columnheader" className="px-4 py-3 text-right">{/* The pencil column. Headed by nothing visible, because the
                  control it heads is only there on hover — a column titled
                  "Edit" above a blank strip reads as data that failed to
                  load. The name survives for screen readers. */}<span className="sr-only">Edit</span></th>
            </tr>
          </thead>
          <tbody role="rowgroup" className="divide-y divide-line">
            {visible.map((task) => (
              <ClickableRow key={task.id} className="cursor-pointer hover:bg-canvas/60">
                <td role="cell" className="px-4 py-3 font-medium">
                  <span className="flex items-center gap-2">
                    {task.title}
                    {task.overdue && (
                      <AlertTriangle
                        className="size-3.5 text-status-behind-ink"
                        aria-label="Overdue"
                      />
                    )}
                  </span>
                </td>
                <td role="cell" data-label="Project" className="px-4 py-3 text-ink-muted">
                  <Link href={`/projects/${task.project_id}`} className="hover:text-brand-700">
                    {task.project.name}
                  </Link>
                </td>
                <td role="cell" data-label="Trade" className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-ink-muted">
                    <TradeDot trade={task.trade} />
                    {TRADE_LABELS[task.trade]}
                  </span>
                </td>
                <td role="cell" data-label="Status" className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_TONE[task.status],
                    )}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                </td>
                <td role="cell" data-label="Crew" className="px-4 py-3 text-ink-muted">
                  {task.crew_size}
                </td>
                <td role="cell" data-label="Scheduled" className="px-4 py-3 text-right text-ink-muted">
                  {task.starts_at ? formatShortDate(task.starts_at) : "—"}
                </td>
                <td role="cell" data-cell="action" className="px-4 py-3 text-right">
                  <EditTaskForm
                    task={task}
                    projects={projects.map((p) => ({ id: p.id, name: p.name }))}
                    buildings={buildingChoices}
                  />
                </td>
              </ClickableRow>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-2">
                  <EmptyState
                    variant="filtered"
                    icon={ListChecks}
                    title="Nothing matches these filters"
                    action={<ClearFilters params={["project", "trade", "status"]} />}
                  >
                    There are tasks here — none of them fit what you have
                    selected.
                  </EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
