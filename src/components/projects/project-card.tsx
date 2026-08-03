import Link from "next/link";
import { ProjectCover } from "@/components/projects/project-cover";
import { Avatar } from "@/components/ui/avatar";
import { cn, formatDate, formatMillions } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/lib/types";

const STATUS_CHIP: Record<ProjectStatus, string> = {
  on_schedule: "bg-brand-50 text-brand-700",
  behind_schedule: "bg-orange-50 text-status-behind-ink",
  at_risk: "bg-rose-50 text-status-risk",
  complete: "bg-canvas text-ink-muted",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  on_schedule: "On Schedule",
  behind_schedule: "Behind Schedule",
  at_risk: "At Risk",
  complete: "Complete",
};

export function ProjectCard({
  project,
  lead,
}: {
  project: Project;
  lead?: { full_name: string; initials: string; role: string };
}) {
  const behind = project.status === "behind_schedule" || project.status === "at_risk";

  return (
    <Link
      href={`/projects/${project.id}`}
      className="card group flex w-full flex-col p-3 transition-shadow hover:shadow-lift"
    >
      <div className="h-36 w-full overflow-hidden rounded-tile">
        <ProjectCover id={project.id} name={project.name} coverUrl={project.cover_url} />
      </div>

      <div className="flex flex-1 flex-col px-1 pt-3.5">
        <span
          className={cn(
            "w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold",
            STATUS_CHIP[project.status],
          )}
        >
          {STATUS_LABEL[project.status]}
        </span>

        <h3 className="mt-2.5 font-semibold leading-snug tracking-tight group-hover:text-brand-700">
          {project.name}
        </h3>
        <p className="mt-0.5 text-xs text-ink-muted">
          {project.city}, {project.state} · {formatMillions(project.budget_spent)} of{" "}
          {formatMillions(project.budget_total)}
        </p>

        <div className="mt-3.5">
          <div className="flex items-baseline justify-between text-[11px] text-ink-muted">
            <span>{project.completion_pct}% complete</span>
            <span>{formatDate(project.target_date)}</span>
          </div>
          <div
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line"
            role="img"
            aria-label={`${project.completion_pct} percent complete`}
          >
            <div
              className={cn("h-full rounded-full", behind ? "bg-status-behind" : "bg-brand-600")}
              style={{ width: `${project.completion_pct}%` }}
            />
          </div>
        </div>

        {lead && (
          <div className="mt-auto flex items-center gap-2.5 border-t border-line pt-3.5">
            <Avatar name={lead.full_name} initials={lead.initials} size="md" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold leading-tight">{lead.full_name}</p>
              <p className="truncate text-[11px] text-ink-subtle">{lead.role}</p>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
