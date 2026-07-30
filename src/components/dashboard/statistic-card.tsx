import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ringed avatar + percentage badge, as in the reference "Statistic" panel. */
function ProgressAvatar({
  initials,
  pct,
  size = 132,
}: {
  initials: string;
  pct: number;
  size?: number;
}) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-line"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          className="stroke-brand-600"
        />
      </svg>

      <span className="absolute inset-[10px] grid place-items-center rounded-full bg-brand-50 text-2xl font-semibold text-brand-700">
        {initials}
      </span>

      <span className="absolute right-0 top-1 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow-soft">
        {clamped}%
      </span>
    </div>
  );
}

export function StatisticCard({
  greeting,
  initials,
  portfolioPct,
  bars,
  caption,
}: {
  greeting: string;
  initials: string;
  portfolioPct: number;
  caption: string;
  bars: { label: string; values: number[] }[];
}) {
  const max = Math.max(1, ...bars.flatMap((group) => group.values));
  const ticks = [max, Math.round(max / 2), 0];

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between">
        <h2 className="font-semibold tracking-tight">Statistic</h2>
        <MoreVertical className="size-4 text-ink-subtle" />
      </div>

      <div className="mt-4 flex flex-col items-center text-center">
        <ProgressAvatar initials={initials} pct={portfolioPct} />
        <p className="mt-3.5 font-semibold tracking-tight">{greeting} 🔥</p>
        <p className="mt-1 text-xs text-ink-muted">{caption}</p>
      </div>

      {/* Grouped bars: light bar = scheduled, solid bar = completed. */}
      <div className="well mt-4 p-3.5">
        <div className="flex gap-2.5">
          <div className="flex flex-col justify-between py-0.5 text-[10px] text-ink-subtle">
            {ticks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>

          <div className="flex flex-1 items-end justify-between gap-3" style={{ height: 96 }}>
            {bars.map((group) => (
              <div key={group.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-24 w-full items-end justify-center gap-1">
                  {group.values.map((value, index) => (
                    <span
                      key={index}
                      title={`${value}`}
                      className={cn(
                        "w-1/2 max-w-6 rounded-md",
                        index === 0 ? "bg-brand-200" : "bg-brand-600",
                      )}
                      style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-ink-subtle">{group.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
