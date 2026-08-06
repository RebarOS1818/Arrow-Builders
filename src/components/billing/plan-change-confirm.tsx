"use client";

import { ArrowRight, CalendarDays, Loader2, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export type PlanSummary = {
  name: string;
  priceCents: number;
  includedSeats: number;
};

/**
 * What a plan change actually does, before it does it.
 *
 * Sola cannot take a mid-cycle difference: `UpdateSchedule` changes what the
 * *next* payment collects and charges nothing today. So this screen's whole job
 * is to say that plainly, because the natural assumption on pressing "Switch to
 * Premium" is that a card is about to be charged — and a bill that arrives
 * weeks later for an amount nobody was shown is how a plan change turns into a
 * dispute.
 *
 * The same screen covers upgrades and downgrades. A downgrade needs the
 * opposite warning: the month already paid for is not refunded, and the new
 * user limit applies immediately, which can put an organization over its
 * allowance the moment it confirms.
 */
export function PlanChangeConfirm({
  from,
  to,
  renewsOn,
  seatsUsed,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  from: PlanSummary;
  to: PlanSummary;
  /** When the next payment runs. Null when Sola has not reported it yet. */
  renewsOn: string | null;
  seatsUsed: number;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const difference = to.priceCents - from.priceCents;
  const isUpgrade = difference > 0;
  // A downgrade whose new ceiling is already exceeded. Said before confirming
  // rather than discovered at the next invite.
  const overAllowance = to.includedSeats < seatsUsed;

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold tracking-tight">
        Switch to {to.name}
      </h3>
      <p className="mt-1 text-sm text-ink-muted">
        {isUpgrade
          ? "Nothing is charged today. Your next payment covers the new plan."
          : "Nothing is refunded today. Your next payment drops to the new plan."}
      </p>

      {/* The change itself, as two plans and an arrow — the shape of the thing
          being decided, before any of the detail below it. */}
      <div className="mt-5 flex flex-wrap items-stretch gap-3">
        <PlanBlock plan={from} label="Now" />
        <div className="grid shrink-0 place-items-center px-1">
          <ArrowRight className="size-5 text-ink-subtle" />
        </div>
        <PlanBlock plan={to} label="From next payment" highlight />
      </div>

      <dl className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
        {/* Without a date this has to read as a sentence rather than a heading
            with its value missing. Sola does not always report the next
            billing date — after a cancellation it reports none at all — and
            "Next payment" sitting alone looks like the date failed to load
            rather than like something nobody has told us. */}
        <Row
          icon={CalendarDays}
          term={renewsOn ? `Next payment, ${formatDate(renewsOn)}` : "From your next payment"}
        >
          <span className="font-semibold tabular-nums">{money(to.priceCents)}</span>
          <span className="text-ink-subtle"> instead of {money(from.priceCents)}</span>
        </Row>

        <Row icon={Users} term="Users included">
          <span className="font-semibold tabular-nums">{to.includedSeats}</span>
          <span className="text-ink-subtle"> instead of {from.includedSeats}</span>
        </Row>

        <div className="flex items-baseline justify-between gap-4 rounded-tile bg-canvas px-4 py-3">
          <dt className="font-medium">Charged today</dt>
          {/* The number people are actually looking for. Zero, stated as a
              figure rather than as prose, because prose is what gets skimmed. */}
          <dd className="text-lg font-semibold tabular-nums">{money(0)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-ink-subtle">
        {isUpgrade
          ? `Your monthly bill goes up by ${money(difference)}. The change takes effect on your next payment${
              // Only promised as a knowable date when there is one. Pointing at
              // "your next payment date" while the row above cannot name it is
              // the app claiming to know something it does not.
              renewsOn ? ` date, ${formatDate(renewsOn)}` : ""
            } — Sola does not prorate, so the month you have already paid for is unaffected.`
          : `Your monthly bill goes down by ${money(-difference)}. The month you have already paid for is not refunded or prorated.`}
      </p>

      {overAllowance && (
        <p className="mt-3 rounded-tile bg-orange-50 p-3 text-sm text-orange-900">
          {to.name} includes {to.includedSeats} users and {seatsUsed} are in use.
          Nobody loses access, but no new invites can be sent until someone is
          removed.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-tile bg-rose-50 p-3 text-sm text-status-risk" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="pressable rounded-full px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-canvas"
        >
          Keep {from.name}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="pressable inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Confirm switch to {to.name}
        </button>
      </div>
    </div>
  );
}

function PlanBlock({
  plan,
  label,
  highlight,
}: {
  plan: PlanSummary;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "min-w-0 flex-1 rounded-card bg-brand-700 p-4 text-white"
          : "min-w-0 flex-1 rounded-card bg-canvas p-4"
      }
    >
      <p
        className={
          highlight
            ? "text-[11px] font-semibold uppercase tracking-wider text-brand-200"
            : "text-[11px] font-semibold uppercase tracking-wider text-ink-subtle"
        }
      >
        {label}
      </p>
      <p className="mt-1.5 font-semibold tracking-tight">{plan.name}</p>
      <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">
        {money(plan.priceCents)}
        <span
          className={
            highlight ? "text-sm font-normal text-brand-200" : "text-sm font-normal text-ink-muted"
          }
        >
          {" "}
          / month
        </span>
      </p>
    </div>
  );
}

function Row({
  icon: Icon,
  term,
  children,
}: {
  icon: React.ElementType;
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <dt className="flex items-center gap-2 text-ink-muted">
        <Icon className="size-4 shrink-0" />
        {term}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
