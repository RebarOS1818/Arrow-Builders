import Link from "next/link";
import { cn } from "@/lib/utils";

export const VIEWS = ["contracts", "changes", "bids", "subs"] as const;
export type View = (typeof VIEWS)[number];

const LABELS: Record<View, string> = {
  contracts: "Contracts",
  changes: "Change orders",
  bids: "Bid packages",
  subs: "Subcontractors",
};

export function viewFrom(value: string | undefined): View {
  return (VIEWS as readonly string[]).includes(value ?? "") ? (value as View) : "contracts";
}

/**
 * Four record types, one at a time.
 *
 * Stacked, they made a page you scrolled rather than read: the money was in the
 * third section and everything above it was in the way. Projects reads as one
 * thing because it shows one grid of one kind of card, which is the whole of the
 * difference — so these take turns instead of queueing.
 *
 * Counts sit on the tabs rather than inside them. Whether there is anything in
 * Change orders is the question you would otherwise switch tabs to answer, and a
 * tab you have to open to find out is empty is a tab that wasted the trip.
 *
 * Links rather than buttons: the view belongs in the URL, so a particular tab
 * can be linked to and the back button undoes a switch.
 */
export function ViewTabs({
  view,
  counts,
}: {
  view: View;
  counts: Record<View, number>;
}) {
  return (
    <div className="scroll-hidden -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {VIEWS.map((key) => {
        const active = key === view;
        return (
          <Link
            key={key}
            href={key === "contracts" ? "/construction" : `/construction?view=${key}`}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "pressable inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "bg-brand-700 text-white"
                : "bg-surface text-ink-muted shadow-soft hover:text-ink",
            )}
          >
            {LABELS[key]}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs tabular-nums",
                active ? "bg-white/15 text-white" : "bg-canvas text-ink-subtle",
              )}
            >
              {counts[key]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
