import { cn } from "@/lib/utils";

/**
 * Projects rarely have a photo on day one, so covers render as a generated
 * elevation motif keyed off the project id. A `cover_url` overrides it.
 */
/*
 * Four variations on the brand navy rather than four unrelated hues. They stay
 * distinguishable enough to tell projects apart at a glance, which is the whole
 * point of keying them off the id — but they no longer include green, which in
 * this app means "on schedule". A decorative green cover on a project running
 * three weeks late is a small lie told in colour.
 */
const PALETTES = [
  { from: "#8699c1", to: "#405377", ink: "#1e2a43" },
  { from: "#7a9db8", to: "#3d566c", ink: "#1b2c3c" },
  { from: "#9096c1", to: "#484e7a", ink: "#212645" },
  { from: "#7aa0ae", to: "#3e5965", ink: "#1b2e37" },
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
            opacity={0.22 + (i % 3) * 0.09}
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
