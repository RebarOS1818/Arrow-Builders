import { cn } from "@/lib/utils";

const TONES = [
  "bg-brand-100 text-brand-800",
  "bg-amber-100 text-amber-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-rose-100 text-rose-800",
  "bg-emerald-100 text-emerald-800",
];

function toneFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

const SIZES = {
  xs: "size-6 text-[9px]",
  sm: "size-7 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-9 text-sm",
} as const;

export function Avatar({
  name,
  initials,
  size = "sm",
  className,
}: {
  name: string;
  initials: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none tracking-tight ring-2 ring-white",
        SIZES[size],
        toneFor(name),
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 3,
  size = "sm",
}: {
  people: { id: string; full_name: string; initials: string }[];
  max?: number;
  size?: keyof typeof SIZES;
}) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-1.5">
        {shown.map((p) => (
          <Avatar key={p.id} name={p.full_name} initials={p.initials} size={size} />
        ))}
      </div>
      {overflow > 0 && (
        <span className="ml-1.5 text-xs font-medium text-ink-muted">+{overflow}</span>
      )}
    </div>
  );
}
