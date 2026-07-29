import Link from "next/link";
import { StatusLabel } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ProjectCover } from "@/components/projects/project-cover";
import { formatDate, formatMillions } from "@/lib/utils";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  const behind = project.status === "behind_schedule" || project.status === "at_risk";

  return (
    <Link
      href={`/projects/${project.id}`}
      className="card group block overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="h-32 w-full">
        <ProjectCover id={project.id} name={project.name} coverUrl={project.cover_url} />
      </div>

      <div className="p-4">
        <h3 className="font-semibold tracking-tight group-hover:text-brand-700">{project.name}</h3>
        <p className="mt-0.5 text-sm text-ink-muted">
          {project.city}, {project.state}
        </p>

        <div className="mt-4 flex items-center gap-4">
          <ProgressRing value={project.completion_pct} tone={behind ? "warn" : "brand"} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <StatusLabel status={project.status} />
            <dl className="space-y-0.5 text-xs text-ink-muted">
              <div className="flex items-baseline justify-between gap-2">
                <dt>Budget</dt>
                <dd className="font-medium text-ink">
                  {formatMillions(project.budget_spent)} / {formatMillions(project.budget_total)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt>Completion</dt>
                <dd className="font-medium text-ink">{formatDate(project.target_date)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </Link>
  );
}
