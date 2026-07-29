import { CheckCircle2, DollarSign, FolderKanban, TrendingUp, Users } from "lucide-react";
import { Sparkline } from "@/components/ui/sparkline";
import { formatCompactCurrency, formatSignedPct } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/types";

type Tile = {
  label: string;
  value: string;
  icon: React.ElementType;
  iconTone: string;
  foot: React.ReactNode;
  trend: number[];
  trendTone?: string;
};

export function MetricTiles({ metrics }: { metrics: DashboardMetrics }) {
  const tiles: Tile[] = [
    {
      label: "Revenue (YTD)",
      value: formatCompactCurrency(metrics.revenueYtd),
      icon: DollarSign,
      iconTone: "bg-brand-50 text-brand-700",
      foot: (
        <span className="flex items-center gap-1 text-brand-700">
          <TrendingUp className="size-3.5" />
          {formatSignedPct(metrics.revenueDeltaPct)} vs last year
        </span>
      ),
      trend: [12, 18, 15, 24, 22, 31, 28, 36],
    },
    {
      label: "Projects",
      value: String(metrics.projectsTotal),
      icon: FolderKanban,
      iconTone: "bg-brand-50 text-brand-700",
      foot: <Dot tone="bg-brand-600">{metrics.projectsActive} active</Dot>,
      trend: [8, 9, 9, 11, 10, 12, 12, 12],
    },
    {
      label: "Tasks",
      value: String(metrics.tasksTotal),
      icon: CheckCircle2,
      iconTone: "bg-orange-50 text-status-behind",
      foot: (
        <Dot tone="bg-status-behind">
          <span className="text-status-behind">{metrics.tasksOverdue} overdue</span>
        </Dot>
      ),
      trend: [40, 52, 48, 61, 58, 72, 78, 86],
      trendTone: "stroke-status-behind",
    },
    {
      label: "Team",
      value: String(metrics.teamTotal),
      icon: Users,
      iconTone: "bg-brand-50 text-brand-700",
      foot: <Dot tone="bg-brand-600">{metrics.teamOnSite} on site today</Dot>,
      trend: [22, 24, 26, 25, 28, 30, 31, 32],
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="card p-4">
          <div className="flex items-start gap-3">
            <span className={`grid size-9 shrink-0 place-items-center rounded-full ${tile.iconTone}`}>
              <tile.icon className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-muted">{tile.label}</p>
              <p className="mt-0.5 text-2xl font-semibold tracking-tight">{tile.value}</p>
            </div>
          </div>
          <div className="mt-2 text-xs font-medium text-ink-muted">{tile.foot}</div>
          <div className="mt-2 opacity-70">
            <Sparkline points={tile.trend} className={tile.trendTone ?? "stroke-brand-500"} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Dot({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-1.5 rounded-full ${tone}`} />
      {children}
    </span>
  );
}
