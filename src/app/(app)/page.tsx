import { GetStarted } from "@/components/dashboard/get-started";
import { HeroBanner } from "@/components/dashboard/hero-banner";
import { ProjectRail } from "@/components/dashboard/project-rail";
import { SiteScheduleTable } from "@/components/dashboard/site-schedule-table";
import { StatPills } from "@/components/dashboard/stat-pills";
import {
  getMetrics,
  getProjects,
  getProperties,
  getTasks,
  getTeam,
  getTodayEvents,
} from "@/lib/data";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [metrics, projects, events, team, tasks, properties] = await Promise.all([
    getMetrics(),
    getProjects(),
    getTodayEvents(),
    getTeam(),
    getTasks(),
    getProperties(),
  ]);

  /** Each project's lead is the first crew member matching its dominant trade. */
  const leads: Record<
    string,
    { full_name: string; initials: string; role: string }
  > = {};
  for (const project of projects) {
    const dominantTrade =
      tasks.find((t) => t.project_id === project.id)?.trade ?? null;
    const lead =
      team.find((m) => m.trade === dominantTrade) ??
      team.find((m) => m.role.includes("Superintendent")) ??
      team[0];
    if (lead) {
      leads[project.id] = {
        full_name: lead.full_name,
        initials: lead.initials,
        role: lead.role,
      };
    }
  }

  // A dashboard of zeros is accurate and useless. Until there is a project to
  // report on, the page's job is to get one made rather than to report nothing.
  if (projects.length === 0) {
    return (
      <div className="min-w-0 space-y-5">
        <GetStarted
          hasProperties={properties.length > 0}
          hasProjects={projects.length > 0}
          // The signed-in admin is themselves a member, so a crew of one is
          // still a crew of nobody as far as this step is concerned.
          hasCrew={team.length > 1}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <HeroBanner
        eyebrow="Portfolio"
        title="Keep every project on schedule and on budget"
        cta="Open Schedule"
        href="/schedule"
      />

      <StatPills metrics={metrics} />

      <ProjectRail
        title="Active Projects"
        projects={projects}
        leads={leads}
        viewAllHref="/projects"
      />

      <SiteScheduleTable events={events} />
    </div>
  );
}
