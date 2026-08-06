import { HardHat } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { NewProjectForm } from "@/components/projects/new-project-form";
import { ProjectCard } from "@/components/projects/project-card";
import { getProjects, getProperties } from "@/lib/data";
import { formatMillions } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, properties] = await Promise.all([
    getProjects(),
    getProperties(),
  ]);

  const totalBudget = projects.reduce(
    (sum, p) => sum + Number(p.budget_total),
    0,
  );
  const totalSpent = projects.reduce(
    (sum, p) => sum + Number(p.budget_spent),
    0,
  );
  const behind = projects.filter(
    (p) => p.status === "behind_schedule" || p.status === "at_risk",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {/* Budget figures say nothing before there is a budget; "$0.00M of
                $0.00M committed" is noise on the one screen that should be
                telling someone what to do next. */}
            {projects.length === 0
              ? "Everything that gets built starts here."
              : `${projects.length} projects · ${formatMillions(totalSpent)} of ${formatMillions(totalBudget)} committed`}
            {behind > 0 && (
              <>
                {" · "}
                <span className="font-medium text-status-behind-ink">
                  {behind} needing attention
                </span>
              </>
            )}
          </p>
        </div>
        {/* Hidden when the list is empty: the empty state carries the same
            action, and two identical buttons on one screen is two decisions
            where there is only one. */}
        {projects.length > 0 && (
          <NewProjectForm
            properties={properties.map((p) => ({ id: p.id, name: p.name }))}
          />
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="No projects yet"
          action={
            <NewProjectForm
              properties={properties.map((p) => ({ id: p.id, name: p.name }))}
            />
          }
        >
          A project is a parcel you have committed to building. Everything after
          this — the schedule, the crew, the budget — hangs off one.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
