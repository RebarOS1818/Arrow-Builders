import Link from "next/link";
import { Suspense } from "react";
import { ApprovalsInbox } from "@/components/dashboard/approvals-inbox";
import { CashFlowCard } from "@/components/dashboard/cash-flow-card";
import { MetricTiles } from "@/components/dashboard/metric-tiles";
import { TodayOnSite } from "@/components/dashboard/today-on-site";
import { ProjectCard } from "@/components/projects/project-card";
import { FilterSelect } from "@/components/ui/filter-select";
import { WeatherIcon, CONDITION_LABEL } from "@/components/ui/weather";
import { demoWeather } from "@/lib/demo-data";
import { siteHour } from "@/lib/utils";
import {
  getApprovals,
  getCashFlow,
  getCurrentProfile,
  getMetrics,
  getOrganization,
  getProjects,
  getTodayEvents,
  getToday,
} from "@/lib/data";

export const dynamic = "force-dynamic";

function greeting() {
  const hour = siteHour();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectFilter } = await searchParams;

  const [org, profile, metrics, projects, events, cashFlow, approvals, today] = await Promise.all([
    getOrganization(),
    getCurrentProfile(),
    getMetrics(),
    getProjects(),
    getTodayEvents(),
    getCashFlow(),
    getApprovals(),
    getToday(),
  ]);

  const selected = projectFilter && projectFilter !== "all" ? projectFilter : null;
  const visibleProjects = selected ? projects.filter((p) => p.id === selected) : projects;
  const visibleEvents = selected ? events.filter((e) => e.project_id === selected) : events;

  const weather =
    demoWeather.find((w) => w.date === today) ?? demoWeather[demoWeather.length - 1]!;

  const firstName = profile.full_name.split(" ")[0];
  const todayLabel = new Date(`${today}T12:00:00`);

  return (
    <div className="space-y-6">
      <Suspense>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            ariaLabel="Organization"
            param="org"
            defaultValue={org.slug}
            options={[{ value: org.slug, label: org.name }]}
            className="w-56"
          />
          <FilterSelect
            ariaLabel="Project filter"
            param="project"
            options={[
              { value: "all", label: "All Projects" },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
            className="w-48"
          />
        </div>
      </Suspense>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brand-700">Dashboard</h1>
          <p className="mt-1 text-lg">
            {greeting()}, {firstName}.
          </p>
          <p className="text-sm text-ink-muted">Here&apos;s what&apos;s happening across your projects.</p>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            <WeatherIcon condition={weather.condition} className="size-6" />
            <span className="text-2xl font-semibold tracking-tight">{weather.high}°F</span>
          </div>
          <p className="text-xs text-ink-muted">{CONDITION_LABEL[weather.condition]}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {todayLabel.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {" · "}
            {todayLabel.toLocaleDateString("en-US", { weekday: "long" })}
          </p>
        </div>
      </div>

      <MetricTiles metrics={metrics} />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold tracking-tight">Active Projects</h2>
          <Link href="/projects" className="text-sm font-medium text-brand-700 hover:underline">
            View all projects
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TodayOnSite events={visibleEvents} />
        <div className="lg:col-span-1">
          <CashFlowCard points={cashFlow} priorNet={218_000} />
        </div>
        <ApprovalsInbox
          approvals={selected ? approvals.filter((a) => a.project_id === selected) : approvals}
          today={today}
        />
      </div>
    </div>
  );
}
