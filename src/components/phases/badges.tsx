import { cn } from "@/lib/utils";

/**
 * Status pills for both phases.
 *
 * Colour carries meaning here, so it never carries it alone — every pill shows
 * a word too. A red dot is invisible to a red-green colourblind user and to
 * anyone reading a printed pay application.
 */

const TONES = {
  neutral: "bg-canvas text-ink-muted",
  info: "bg-brand-50 text-brand-700",
  good: "bg-mint-50 text-mint-600",
  warn: "bg-orange-50 text-status-behind-ink",
  bad: "bg-rose-50 text-status-risk",
} as const;

type Tone = keyof typeof TONES;

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Turns snake_case enum values into readable labels. */
export const humanise = (value: string) =>
  value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const PROPERTY_TONES: Record<string, Tone> = {
  prospecting: "info",
  pre_planning: "info",
  planning: "neutral",
  under_contract: "warn",
  owned_predevelopment: "neutral",
  in_development: "warn",
  units_listed: "info",
  partially_sold: "warn",
  sold_out: "good",
  // Not a failure, but the one stage that means no further work will happen —
  // the only one worth setting apart from the rest of the pipeline at a glance.
  passed: "bad",
};

const STUDY_TONES: Record<string, Tone> = {
  not_started: "neutral",
  in_progress: "info",
  complete: "good",
  blocked: "bad",
};

const VERDICT_TONES: Record<string, Tone> = {
  favorable: "good",
  conditional: "warn",
  unfavorable: "bad",
};

const SEVERITY_TONES: Record<string, Tone> = {
  informational: "neutral",
  minor: "info",
  major: "warn",
  fatal: "bad",
};

const OFFER_TONES: Record<string, Tone> = {
  draft: "neutral",
  submitted: "info",
  countered: "warn",
  accepted: "good",
  rejected: "bad",
  withdrawn: "neutral",
  expired: "neutral",
};

const CONTRACT_TONES: Record<string, Tone> = {
  draft: "neutral",
  sent: "info",
  executed: "good",
  in_progress: "info",
  complete: "good",
  terminated: "bad",
};

const CHANGE_TONES: Record<string, Tone> = {
  draft: "neutral",
  submitted: "warn",
  approved: "good",
  rejected: "bad",
  void: "neutral",
};

const BID_TONES: Record<string, Tone> = {
  draft: "neutral",
  open: "info",
  closed: "warn",
  awarded: "good",
  cancelled: "neutral",
};

/**
 * Shared by buildings and units: a unit's states are the building's plus the
 * three a building never reaches. One map because "complete" has to look the
 * same on both, and two maps drift.
 */
const BUILD_TONES: Record<string, Tone> = {
  planned: "neutral",
  permitting: "info",
  under_construction: "warn",
  complete: "good",
  on_hold: "bad",
  reserved: "info",
  sold: "good",
  leased: "good",
};

const MAPS: Record<string, Record<string, Tone>> = {
  property: PROPERTY_TONES,
  study: STUDY_TONES,
  verdict: VERDICT_TONES,
  severity: SEVERITY_TONES,
  offer: OFFER_TONES,
  contract: CONTRACT_TONES,
  change: CHANGE_TONES,
  bid: BID_TONES,
  build: BUILD_TONES,
  unit: BUILD_TONES,
};

export function StatusPill({
  kind,
  value,
}: {
  kind: keyof typeof MAPS;
  value: string | null;
}) {
  if (!value) return <span className="text-xs text-ink-subtle">—</span>;
  return <Pill tone={MAPS[kind]?.[value] ?? "neutral"}>{humanise(value)}</Pill>;
}
