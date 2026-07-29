import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import { TRADE_LABELS, TradeDot } from "@/components/ui/badge";
import { getProjects, getTasks } from "@/lib/data";
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

  const [tasks, projects] = await Promise.all([getTasks(), getProjects()]);

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
                <span className="font-medium text-status-behind">
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
          </div>
        </Suspense>
      </div>

      <div className="card scroll-thin overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold text-ink-muted">
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Trade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Crew</th>
              <th className="px-4 py-3 text-right">Scheduled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((task) => (
              <tr key={task.id} className="hover:bg-canvas/60">
                <td className="px-4 py-3 font-medium">
                  <span className="flex items-center gap-2">
                    {task.title}
                    {task.overdue && (
                      <AlertTriangle
                        className="size-3.5 text-status-behind"
                        aria-label="Overdue"
                      />
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  <Link href={`/projects/${task.project_id}`} className="hover:text-brand-700">
                    {task.project.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-ink-muted">
                    <TradeDot trade={task.trade} />
                    {TRADE_LABELS[task.trade]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_TONE[task.status],
                    )}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-muted">{task.crew_size}</td>
                <td className="px-4 py-3 text-right text-ink-muted">
                  {task.starts_at ? formatShortDate(task.starts_at) : "—"}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                  No tasks match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
