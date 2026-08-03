import { cn } from "@/lib/utils";
import type { ProjectStatus, Trade } from "@/lib/types";

export const TRADE_LABELS: Record<Trade, string> = {
  general: "General",
  concrete: "Concrete",
  electrical: "Electrical",
  plumbing: "Plumbing",
  finishes: "Finishes",
};

export const TRADE_DOT: Record<Trade, string> = {
  general: "bg-trade-general",
  concrete: "bg-trade-concrete",
  electrical: "bg-trade-electrical",
  plumbing: "bg-trade-plumbing",
  finishes: "bg-trade-finishes",
};

export const TRADE_ACCENT: Record<Trade, string> = {
  general: "border-l-trade-general",
  concrete: "border-l-trade-concrete",
  electrical: "border-l-trade-electrical",
  plumbing: "border-l-trade-plumbing",
  finishes: "border-l-trade-finishes",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  on_schedule: "On Schedule",
  behind_schedule: "Behind Schedule",
  at_risk: "At Risk",
  complete: "Complete",
};

const STATUS_TONE: Record<ProjectStatus, string> = {
  on_schedule: "text-status-ontrack",
  behind_schedule: "text-status-behind-ink",
  at_risk: "text-status-risk",
  complete: "text-ink-muted",
};

export function StatusLabel({ status }: { status: ProjectStatus }) {
  return (
    <span className={cn("text-sm font-semibold", STATUS_TONE[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function TradeDot({ trade }: { trade: Trade }) {
  return <span className={cn("inline-block size-2 rounded-full", TRADE_DOT[trade])} />;
}

export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
