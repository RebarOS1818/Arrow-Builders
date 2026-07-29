import { AvatarStack } from "@/components/ui/avatar";
import { TRADE_ACCENT } from "@/components/ui/badge";
import { cn, formatShortDate } from "@/lib/utils";
import type { TaskStatus, TaskWithProject } from "@/lib/types";
import type { CrewMember } from "@/components/schedule/task-card";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "unscheduled", label: "Unscheduled" },
  { status: "scheduled", label: "Scheduled" },
  { status: "in_progress", label: "In Progress" },
  { status: "blocked", label: "Blocked" },
  { status: "done", label: "Done" },
];

/** Status kanban — the "Board" view of the same task set. */
export function TaskBoard({
  tasks,
  crewByTask,
}: {
  tasks: TaskWithProject[];
  crewByTask: Record<string, CrewMember[]>;
}) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <div className="grid min-w-[900px] grid-cols-5 gap-3">
        {COLUMNS.map((column) => {
          const items = tasks.filter((t) => t.status === column.status);
          return (
            <section key={column.status} className="rounded-card bg-surface/60 p-2">
              <div className="flex items-center justify-between px-1 pb-2">
                <h3 className="text-sm font-semibold">{column.label}</h3>
                <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-ink-muted">
                  {items.length}
                </span>
              </div>

              <div className="space-y-2">
                {items.map((task) => (
                  <article
                    key={task.id}
                    className={cn("card border-l-[3px] p-2.5", TRADE_ACCENT[task.trade])}
                  >
                    <p className="text-[13px] font-semibold leading-tight">{task.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                      {task.project.name}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <AvatarStack people={crewByTask[task.id] ?? []} max={2} size="xs" />
                      {task.starts_at && (
                        <span className="text-[11px] text-ink-subtle">
                          {formatShortDate(task.starts_at)}
                        </span>
                      )}
                    </div>
                  </article>
                ))}

                {items.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-ink-subtle">Empty</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
