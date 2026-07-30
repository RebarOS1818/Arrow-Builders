import { cn } from "@/lib/utils";

/** Users against the plan's included allowance. Turns amber when full. */
export function SeatMeter({
  used,
  limit,
  members,
  pendingInvites,
}: {
  used: number;
  limit: number;
  members: number;
  pendingInvites: number;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  const full = limit > 0 && used >= limit;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-ink-muted">Users</p>
        <p className="text-sm font-semibold">
          {used} <span className="font-normal text-ink-muted">of {limit}</span>
        </p>
      </div>

      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line"
        role="img"
        aria-label={`${used} of ${limit} users`}
      >
        <div
          className={cn("h-full rounded-full", full ? "bg-status-behind" : "bg-brand-600")}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        {members} member{members === 1 ? "" : "s"}
        {pendingInvites > 0 && ` · ${pendingInvites} pending invite${pendingInvites === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
