import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, FileText } from "lucide-react";
import { MapLink } from "@/components/phases/map-link";
import { OpenOnClick } from "@/components/phases/open-on-click";
import { BuildingCard, NoBuildings } from "@/components/construction/building-card";
import { NewBuildingForm } from "@/components/construction/building-forms";
import {
  EditApprovalForm,
  EditDocumentForm,
  EditTaskForm,
} from "@/components/phases/edit-forms";
import { EditProjectForm } from "@/components/projects/new-project-form";
import { ProjectCover } from "@/components/projects/project-cover";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusLabel, TRADE_LABELS, TradeDot } from "@/components/ui/badge";
import {
  getApprovals,
  getDocuments,
  getBuildings,
  getMilestones,
  getProjects,
  getProperties,
  getTasks,
  getTeam,
} from "@/lib/data";
import { formatCurrency, formatDate, formatMillions, formatShortDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [projects, tasks, milestones, documents, approvals, properties, buildings, team] =
    await Promise.all([
      getProjects(),
      getTasks(),
      getMilestones(),
      getDocuments(),
      getApprovals(),
      getProperties(),
      getBuildings(id),
      getTeam(),
    ]);

  const project = projects.find((p) => p.id === id);
  if (!project) notFound();

  // What a building can point at. Parcels are named by address where they have
  // one, because "Oakline" means nothing to somebody holding a permit.
  const links = {
    properties: properties.map((p) => ({ id: p.id, name: p.address || p.name })),
    team: team.map((m) => ({ id: m.id, name: m.full_name })),
  };
  // Only this project's, which is the only set the database will accept on a
  // task or document filed here.
  const buildingChoices = buildings.map((b) => ({
    id: b.id,
    name: b.name,
    project_id: b.project_id,
  }));

  const projectTasks = tasks.filter((t) => t.project_id === id);
  const projectMilestones = milestones.filter((m) => m.project_id === id);
  const projectDocs = documents.filter((d) => d.project_id === id);
  const projectApprovals = approvals.filter((a) => a.project_id === id);

  const remaining = Number(project.budget_total) - Number(project.budget_spent);
  const behind = project.status === "behind_schedule" || project.status === "at_risk";

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All projects
      </Link>

      <section className="card overflow-hidden">
        <div className="h-40 w-full sm:h-48">
          <ProjectCover id={project.id} name={project.name} coverUrl={project.cover_url} />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-6 p-5">
          <div>
            {/* No row to click on a detail page, so the title block is the
                record's container. */}
            <OpenOnClick className="flex cursor-pointer flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <EditProjectForm
                project={project}
                properties={properties.map((p) => ({
                  id: p.id,
                  name: p.address || p.name,
                }))}
              />
            </OpenOnClick>
            <MapLink
              className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-muted"
              city={project.city}
              state={project.state}
            />
            <div className="mt-3 flex items-center gap-3">
              <StatusLabel status={project.status} />
              <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                <CalendarDays className="size-4" />
                Target {formatDate(project.target_date)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <ProgressRing value={project.completion_pct} size={72} stroke={7} tone={behind ? "warn" : "brand"} />
            <dl className="grid grid-cols-3 gap-6 text-sm">
              <Stat label="Budget" value={formatMillions(Number(project.budget_total))} />
              <Stat label="Spent" value={formatMillions(Number(project.budget_spent))} />
              <Stat label="Remaining" value={formatMillions(remaining)} />
            </dl>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <h2 className="font-semibold tracking-tight">Tasks ({projectTasks.length})</h2>
          <ul className="mt-3 divide-y divide-line">
            {projectTasks.map((task) => (
              <li key={task.id}>
                {/* Every line on this page opens its own record. Reading a task
                    here and having to find it again on another screen to change
                    one date is the kind of trip nobody makes twice. */}
                <OpenOnClick className="flex cursor-pointer items-center gap-3 py-2.5">
                  <TradeDot trade={task.trade} />
                  <span className="flex-1 text-sm font-medium">{task.title}</span>
                  <span className="text-xs text-ink-muted">{TRADE_LABELS[task.trade]}</span>
                  <span className="w-24 text-right text-xs text-ink-subtle">
                    {task.starts_at ? formatShortDate(task.starts_at) : "Unscheduled"}
                  </span>
                  <EditTaskForm
                    task={task}
                    projects={projects.map((p) => ({ id: p.id, name: p.name }))}
                    buildings={buildingChoices}
                  />
                </OpenOnClick>
              </li>
            ))}
            {projectTasks.length === 0 && (
              <li className="py-6 text-center text-sm text-ink-muted">No tasks yet.</li>
            )}
          </ul>
        </section>

        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="font-semibold tracking-tight">Milestones</h2>
            <ul className="mt-3 space-y-3">
              {projectMilestones.map((milestone) => (
                <li key={milestone.id}>
                  <p className="text-sm font-medium">{milestone.title}</p>
                  <p className="text-xs text-ink-muted">
                    {formatShortDate(milestone.starts_at)} – {formatShortDate(milestone.ends_at)}
                  </p>
                </li>
              ))}
              {projectMilestones.length === 0 && (
                <li className="py-4 text-center text-sm text-ink-muted">None scheduled.</li>
              )}
            </ul>
          </section>

          <section className="card p-4">
            <h2 className="font-semibold tracking-tight">Open Approvals</h2>
            <ul className="mt-3 space-y-3">
              {projectApprovals.map((approval) => (
                <li key={approval.id}>
                  <OpenOnClick className="flex cursor-pointer items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{approval.reference}</span>
                    <span className="flex items-baseline gap-2">
                      {approval.amount != null && (
                        <span className="text-sm text-ink-muted">
                          {formatCurrency(approval.amount)}
                        </span>
                      )}
                      <EditApprovalForm
                        approval={approval}
                        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
                      />
                    </span>
                  </OpenOnClick>
                </li>
              ))}
              {projectApprovals.length === 0 && (
                <li className="py-4 text-center text-sm text-ink-muted">Nothing pending.</li>
              )}
            </ul>
          </section>

          <section className="card p-4">
            <h2 className="font-semibold tracking-tight">Documents</h2>
            <ul className="mt-3 space-y-3">
              {projectDocs.map((document) => (
                <li key={document.id}>
                  <OpenOnClick className="flex cursor-pointer items-center gap-2">
                    <FileText className="size-4 shrink-0 text-ink-subtle" />
                    <span className="min-w-0 flex-1 truncate text-sm">{document.name}</span>
                    <EditDocumentForm
                      document={document}
                      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
                      buildings={buildingChoices}
                    />
                  </OpenOnClick>
                </li>
              ))}
              {projectDocs.length === 0 && (
                <li className="py-4 text-center text-sm text-ink-muted">No documents.</li>
              )}
            </ul>
          </section>
        </div>
      </div>

      {/* Buildings ------------------------------------------------- */}
      <section>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Buildings</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Units belong to a building, and the sales figures are counted from
              them — nothing here is typed twice.
            </p>
          </div>
          <NewBuildingForm projectId={project.id} links={links} />
        </div>
        <div className="mt-3">
          {buildings.length === 0 ? (
            <NoBuildings />
          ) : (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {buildings.map((building) => (
                <BuildingCard key={building.id} building={building} links={links} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}
