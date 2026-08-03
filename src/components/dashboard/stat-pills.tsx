import Link from "next/link";
import { HardHat, ListChecks, MoreVertical, Users } from "lucide-react";
import { formatCompactCurrency } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/types";

/** The three summary pills that sit under the banner. */
export function StatPills({ metrics }: { metrics: DashboardMetrics }) {
  const pills = [
    {
      href: "/projects",
      icon: HardHat,
      tone: "bg-brand-50 text-brand-600",
      caption: `${metrics.projectsActive} active · ${formatCompactCurrency(metrics.revenueYtd)} YTD`,
      title: `${metrics.projectsTotal} Projects`,
    },
    {
      href: "/tasks",
      icon: ListChecks,
      tone: "bg-orange-50 text-status-behind-ink",
      caption: `${metrics.tasksOverdue} overdue`,
      title: `${metrics.tasksTotal} Tasks`,
    },
    {
      href: "/teams",
      icon: Users,
      tone: "bg-teal-50 text-trade-plumbing",
      caption: `${metrics.teamOnSite} on site today`,
      title: `${metrics.teamTotal} Crew`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {pills.map((pill) => (
        <Link
          key={pill.title}
          href={pill.href}
          className="card flex items-center gap-3 px-4 py-3.5 transition-shadow hover:shadow-lift"
        >
          <span className={`grid size-10 shrink-0 place-items-center rounded-tile ${pill.tone}`}>
            <pill.icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-ink-subtle">{pill.caption}</p>
            <p className="truncate font-semibold tracking-tight">{pill.title}</p>
          </div>
          <MoreVertical className="size-4 shrink-0 text-ink-subtle" />
        </Link>
      ))}
    </div>
  );
}
