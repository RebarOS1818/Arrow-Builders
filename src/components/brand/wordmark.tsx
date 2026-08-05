import { cn } from "@/lib/utils";

/**
 * "Arrow Upscale Builders", set the way the printed lockup sets it: the name
 * carrying the weight, the descriptor beneath it in small letterspaced caps.
 *
 * Stacked rather than run on one line because the full name does not fit the
 * navigation rail's 248px beside a 40px mark — it would either wrap in an
 * arbitrary place or force the type down to a size nobody reads. Stacking is
 * also simply what the brand does.
 *
 * The descriptor is ink-subtle, not the brand amber it uses in print. Amber
 * type is 1.9:1 on white; at 10px that is unreadable rather than merely
 * decorative, and the amber is already carrying the mark right beside it.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span className="font-semibold tracking-tight">Arrow</span>
      <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
        Upscale Builders
      </span>
    </span>
  );
}
