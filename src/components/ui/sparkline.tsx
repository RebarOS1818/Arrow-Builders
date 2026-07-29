/** Tiny inline trend line for the metric tiles. Purely decorative. */
export function Sparkline({
  points,
  width = 150,
  height = 26,
  className = "stroke-brand-500",
}: {
  points: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);

  const d = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / span) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      aria-hidden
      preserveAspectRatio="none"
    >
      <path d={d} fill="none" strokeWidth={1.5} strokeLinecap="round" className={className} />
    </svg>
  );
}
