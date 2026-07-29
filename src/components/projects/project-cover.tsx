import { cn } from "@/lib/utils";

/**
 * Projects rarely have a photo on day one, so covers render as a generated
 * elevation motif keyed off the project id. A `cover_url` overrides it.
 */
const PALETTES = [
  { from: "#dfe7ea", to: "#aebcc4", ink: "#5c6b74" },
  { from: "#f0e3cf", to: "#cbae83", ink: "#7c6244" },
  { from: "#e2e8e2", to: "#b3c4b6", ink: "#5a6f5e" },
  { from: "#e6e2ec", to: "#b8b0c8", ink: "#655c78" },
];

function paletteFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTES[hash % PALETTES.length]!;
}

export function ProjectCover({
  id,
  name,
  coverUrl,
  className,
}: {
  id: string;
  name: string;
  coverUrl?: string | null;
  className?: string;
}) {
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt={name}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  const p = paletteFor(id);
  const bars = Array.from({ length: 7 }, (_, i) => {
    let h = 0;
    for (let c = 0; c < name.length; c++) h = (h * 17 + name.charCodeAt(c) + i * 13) >>> 0;
    return 26 + (h % 55);
  });

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{ background: `linear-gradient(160deg, ${p.from}, ${p.to})` }}
      role="img"
      aria-label={`${name} cover`}
    >
      <svg viewBox="0 0 140 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
        {bars.map((h, i) => (
          <rect
            key={i}
            x={i * 20 + 2}
            y={100 - h}
            width={16}
            height={h}
            fill={p.ink}
            opacity={0.18 + (i % 3) * 0.07}
          />
        ))}
        <g stroke={p.ink} strokeOpacity={0.22} strokeWidth={0.6}>
          {bars.map((h, i) =>
            Array.from({ length: Math.floor(h / 12) }, (_, r) => (
              <line
                key={`${i}-${r}`}
                x1={i * 20 + 2}
                x2={i * 20 + 18}
                y1={100 - h + r * 12 + 6}
                y2={100 - h + r * 12 + 6}
              />
            )),
          )}
        </g>
      </svg>
      <div className="absolute inset-0 bg-linear-to-t from-black/15 to-transparent" />
    </div>
  );
}
