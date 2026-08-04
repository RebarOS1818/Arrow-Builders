import { TRADE_BLOCK } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { dayOfMonth, rangeLabel, spanColumns, weekDays, weekdayLabel } from "@/lib/week";
import type { Milestone, Project, TaskWithProject } from "@/lib/types";

type MilestoneWithProject = Milestone & { project: { id: string; name: string } };

/** Gantt-style week: one lane per project, bars for milestones and day tasks. */
export function TaskTimeline({
  projects,
  tasks,
  milestones,
  weekStart,
  today,
}: {
  projects: Project[];
  tasks: TaskWithProject[];
  milestones: MilestoneWithProject[];
  weekStart: string;
  today: string;
}) {
  const days = weekDays(weekStart);

  return (
    <div className="card scroll-thin overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[200px_repeat(7,minmax(0,1fr))] border-b border-line">
          <div className="px-4 py-2 text-xs font-semibold text-ink-muted">Project</div>
          {days.map((day) => (
            <div
              key={day}
              className={cn(
                "border-l border-line px-3 py-2 text-xs font-semibold",
                day === today && "bg-brand-50/60",
              )}
            >
              {weekdayLabel(day)} <span className="text-ink-muted">{dayOfMonth(day)}</span>
            </div>
          ))}
        </div>

        {projects.map((project) => {
          const projectMilestones = milestones.filter((m) => m.project_id === project.id);
          const projectTasks = tasks.filter((t) => t.project_id === project.id && t.starts_at);

          return (
            <div
              key={project.id}
              className="grid grid-cols-[200px_repeat(7,minmax(0,1fr))] border-b border-line last:border-b-0"
            >
              <div className="px-4 py-3">
                <p className="text-sm font-medium leading-tight">{project.name}</p>
                <p className="text-[11px] text-ink-muted">
                  {project.city}, {project.state}
                </p>
              </div>

              <div className="relative col-span-7 grid grid-cols-7 gap-y-1.5 py-2 pr-2">
                {/* Day gridlines sit behind the bars and span the full lane height. */}
                <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-7">
                  {days.map((day) => (
                    <div
                      key={day}
                      className={cn("border-l border-line", day === today && "bg-brand-50/40")}
                    />
                  ))}
                </div>

                {projectMilestones.map((milestone) => {
                  const span = spanColumns(milestone.starts_at, milestone.ends_at, weekStart);
                  if (!span) return null;
                  return (
                    <div
                      key={milestone.id}
                      style={{ gridColumnStart: span.start, gridColumnEnd: span.end }}
                      className="z-10 ml-1 flex items-center gap-2 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-medium text-white"
                    >
                      <span className="truncate">{milestone.title}</span>
                      <span className="ml-auto hidden shrink-0 opacity-80 lg:block">
                        {rangeLabel(milestone.starts_at, milestone.ends_at)}
                      </span>
                    </div>
                  );
                })}

                {projectTasks.map((task) => {
                  const span = spanColumns(task.starts_at!, task.ends_at ?? task.starts_at!, weekStart);
                  if (!span) return null;
                  return (
                    <div
                      key={task.id}
                      style={{ gridColumnStart: span.start, gridColumnEnd: span.end }}
                      className={cn(
                        "z-10 ml-1 flex items-center gap-1.5 rounded-full border-l-[3px] px-2.5 py-1.5 text-[11px]",
                        TRADE_BLOCK[task.trade],
                      )}
                    >
                      <span className="truncate font-semibold">{task.title}</span>
                    </div>
                  );
                })}

                {projectMilestones.length === 0 && projectTasks.length === 0 && (
                  <div className="col-span-7 px-3 py-2 text-[11px] text-ink-subtle">
                    Nothing scheduled this week
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
