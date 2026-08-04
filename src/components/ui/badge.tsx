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

/**
 * A timeline bar, blocked in its trade colour.
 *
 * A tint with a saturated edge rather than a saturated fill with white text.
 * The reference fills its bars solid, but it labels them at 14px in green and
 * purple; these are 11px, and four of the five trade colours fall below 4.5:1
 * against white — plumbing green is 3.2:1, finishes pink 2.6:1. The tint keeps
 * the colour blocking and puts dark ink on top, which reads at any size.
 */
export const TRADE_BLOCK: Record<Trade, string> = {
  general: "bg-trade-general/20 border-trade-general",
  concrete: "bg-trade-concrete/20 border-trade-concrete",
  electrical: "bg-trade-electrical/15 border-trade-electrical",
  plumbing: "bg-trade-plumbing/15 border-trade-plumbing",
  finishes: "bg-trade-finishes/18 border-trade-finishes",
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

/**
 * Status as a filled pill rather than coloured words.
 *
 * The fill is the light end of each hue with the saturated version as the dot,
 * so the colour is doing the signalling while the text stays dark enough to
 * read — amber type on white is 2.2:1, which is why "behind schedule" can never
 * simply be amber words.
 */
const STATUS_TONE: Record<ProjectStatus, { pill: string; dot: string }> = {
  on_schedule: { pill: "bg-mint-50 text-status-ontrack", dot: "bg-status-ontrack" },
  behind_schedule: {
    pill: "bg-accent-50 text-status-behind-ink",
    dot: "bg-status-behind",
  },
  at_risk: { pill: "bg-rose-50 text-status-risk", dot: "bg-status-risk" },
  complete: { pill: "bg-canvas text-ink-muted", dot: "bg-ink-subtle" },
};

export function StatusLabel({ status }: { status: ProjectStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        tone.pill,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
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
        // Flat and tinted, not outlined: a chip is a value you read, and an
        // outline is the app's signal for something you press.
        "inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
