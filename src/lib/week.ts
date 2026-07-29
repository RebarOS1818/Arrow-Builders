/** Date helpers for the schedule board. All dates are plain `YYYY-MM-DD`. */

/**
 * True only for a real calendar date in `YYYY-MM-DD` form. Query params reach
 * these helpers directly, and an unchecked value would make `toISOString()`
 * throw `RangeError: Invalid time value` and 500 the page.
 */
export function isISODate(value: string | undefined | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parse(iso: string) {
  return new Date(`${iso}T12:00:00Z`);
}

export function addDays(iso: string, days: number) {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/** Monday of the week containing `iso`. */
export function startOfWeek(iso: string) {
  const d = parse(iso);
  const dow = d.getUTCDay(); // 0 = Sunday
  const delta = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + delta);
  return toISODate(d);
}

export function weekDays(startIso: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(startIso, i));
}

export function weekdayLabel(iso: string) {
  return parse(iso).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

export function dayOfMonth(iso: string) {
  return parse(iso).getUTCDate();
}

/** "May 12 – May 18, 2025" */
export function weekRangeLabel(startIso: string) {
  const start = parse(startIso);
  const end = parse(addDays(startIso, 6));
  const fmt = (d: Date, withYear = false) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
      ...(withYear ? { year: "numeric" } : {}),
    });
  return `${fmt(start)} – ${fmt(end, true)}`;
}

/** "May 12 – May 16" */
export function rangeLabel(startIso: string, endIso: string) {
  const fmt = (iso: string) =>
    parse(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

/** Clamps a span to the visible week, returning 1-based grid columns. */
export function spanColumns(startIso: string, endIso: string, weekStart: string) {
  const weekEnd = addDays(weekStart, 6);
  if (endIso < weekStart || startIso > weekEnd) return null;

  const dayIndex = (iso: string) =>
    Math.round((parse(iso).getTime() - parse(weekStart).getTime()) / 86_400_000);

  const from = Math.max(0, dayIndex(startIso));
  const to = Math.min(6, dayIndex(endIso));
  return { start: from + 1, end: to + 2 };
}
