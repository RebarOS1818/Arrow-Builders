import { cn } from "@/lib/utils";

/** Donut used on project cards to show percent complete. */
export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  tone = "brand",
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: "brand" | "warn";
  className?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * circumference;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped}% complete`}
    >
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
          className={tone === "warn" ? "stroke-status-behind" : "stroke-brand-600"}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink">
        {clamped}%
      </span>
    </div>
  );
}
