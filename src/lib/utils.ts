import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Field schedules are read in the project's local time, not the server's, so
 * every clock-facing formatter pins the same zone.
 */
export const SITE_TIME_ZONE = "America/Chicago";

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

const fullCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** $2.48M — used for headline metrics. */
export function formatCompactCurrency(value: number) {
  return compactCurrency.format(value);
}

/** $0.88M — budgets always read in millions so the pair stays comparable. */
export function formatMillions(value: number) {
  return `$${(value / 1_000_000).toFixed(2)}M`;
}

/** $18,650 — used where the exact figure matters (approvals, invoices). */
export function formatCurrency(value: number) {
  return fullCurrency.format(value);
}

export function formatSignedPct(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}

/** "Aug 22, 2025" */
export function formatDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "May 16" */
export function formatShortDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** "6:30 AM" in the project's local time. */
export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: SITE_TIME_ZONE,
  });
}

/** Hour of day (0–23) at the site, used for the greeting. */
export function siteHour(date = new Date()) {
  return Number(
    date.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: SITE_TIME_ZONE }),
  );
}

export function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
