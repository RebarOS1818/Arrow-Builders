import { CrewPanel } from "@/components/dashboard/crew-panel";
import { HeroBanner } from "@/components/dashboard/hero-banner";
import { ProjectRail } from "@/components/dashboard/project-rail";
import { SiteScheduleTable } from "@/components/dashboard/site-schedule-table";
import { StatPills } from "@/components/dashboard/stat-pills";
import { StatisticCard } from "@/components/dashboard/statistic-card";
import {
  getCurrentProfile,
  getMetrics,
  getProjects,
  getTasks,
  getTeam,
  getTodayEvents,
} from "@/lib/data";
import { siteHour } from "@/lib/utils";

export const dynamic = "force-dynamic";

function greeting() {
  const hour = siteHour();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export default async function DashboardPage() {
  const [profile, metrics, projects, events, team, tasks] = await Promise.all([
    getCurrentProfile(),
    getMetrics(),
    getProjects(),
    getTodayEvents(),
    getTeam(),
    getTasks(),
  ]);

  const firstName = profile.full_name.split(" ")[0];

  // Portfolio completion is the budget-weighted average of project progress.
  const totalBudget = projects.reduce((sum, p) => sum + Number(p.budget_total), 0);
  const portfolioPct = totalBudget
    ? Math.round(
        projects.reduce((sum, p) => sum + p.completion_pct * Number(p.budget_total), 0) /
          totalBudget,
      )
    : 0;

  /** Each project's lead is the first crew member matching its dominant trade. */
  const leads: Record<string, { full_name: string; initials: string; role: string }> = {};
  for (const project of projects) {
    const dominantTrade = tasks.find((t) => t.project_id === project.id)?.trade ?? null;
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

  // Bars group scheduled vs. done per project, the closest read on weekly throughput.
  const bars = projects.slice(0, 3).map((project) => {
    const projectTasks = tasks.filter((t) => t.project_id === project.id);
    return {
      label: project.name.split(" ")[0]!,
      values: [
        projectTasks.filter((t) => t.status !== "done").length,
        projectTasks.filter((t) => t.status === "done").length,
      ],
    };
  });

  const behind = projects.filter(
    (p) => p.status === "behind_schedule" || p.status === "at_risk",
  ).length;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
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

      <div className="space-y-5">
        <StatisticCard
          greeting={`${greeting()} ${firstName}`}
          initials={profile.initials}
          portfolioPct={portfolioPct}
          caption={
            behind > 0
              ? `${behind} project${behind > 1 ? "s" : ""} ${behind > 1 ? "need" : "needs"} attention today.`
              : "Every project is tracking to plan."
          }
          bars={bars}
        />

        <CrewPanel crew={team} />
      </div>
    </div>
  );
}
