import { ProjectCard } from "@/components/projects/project-card";
import { getProjects } from "@/lib/data";
import { formatMillions } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getProjects();

  const totalBudget = projects.reduce((sum, p) => sum + Number(p.budget_total), 0);
  const totalSpent = projects.reduce((sum, p) => sum + Number(p.budget_spent), 0);
  const behind = projects.filter(
    (p) => p.status === "behind_schedule" || p.status === "at_risk",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {projects.length} projects · {formatMillions(totalSpent)} of {formatMillions(totalBudget)}{" "}
          committed
          {behind > 0 && (
            <>
              {" · "}
              <span className="font-medium text-status-behind">{behind} needing attention</span>
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
