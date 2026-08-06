import { Star } from "lucide-react";
import { Pill, StatusPill, humanise } from "@/components/phases/badges";
import {
  EditBidPackageForm,
  EditChangeOrderForm,
  EditQuoteForm,
  EditSubcontractorForm,
} from "@/components/phases/edit-forms";
import { OpenOnClick } from "@/components/phases/open-on-click";
import { TRADE_LABELS } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type {
  BidPackageWithQuotes,
  ChangeOrderWithContract,
  Subcontractor,
} from "@/lib/types";

/** Days before an insurance certificate lapses that we start warning. */
export const INSURANCE_WARNING_DAYS = 60;

/**
 * A change order, as a card.
 *
 * The amount leads because it is the only part that changes what the job costs,
 * and a credit back to the owner is the one case where a minus sign is good
 * news — so it is coloured rather than left to be read as a smaller number.
 */
export function ChangeOrderCard({ order }: { order: ChangeOrderWithContract }) {
  const credit = order.amount < 0;

  return (
    <OpenOnClick className="card group flex cursor-pointer flex-col p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tabular-nums text-ink-subtle">
            {order.contract.contract_number} · CO {order.number}
          </p>
          <p
            className={`mt-0.5 text-2xl font-semibold tracking-tight tabular-nums ${
              credit ? "text-mint-600" : "text-ink"
            }`}
          >
            {order.amount > 0 ? "+" : ""}
            {formatCurrency(order.amount)}
          </p>
        </div>
        <span className="flex items-center gap-2">
          <StatusPill kind="change" value={order.status} />
          <EditChangeOrderForm changeOrder={order} />
        </span>
      </div>

      <p className="mt-3 text-sm text-ink-muted">{order.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Pill tone="neutral">{humanise(order.reason)}</Pill>
        {order.days_impact !== 0 && (
          <Pill tone={order.days_impact > 0 ? "warn" : "good"}>
            {order.days_impact > 0 ? "+" : ""}
            {order.days_impact} days
          </Pill>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-subtle">
        {order.project.name}
        {order.submitted_at && ` · submitted ${formatDate(order.submitted_at)}`}
      </p>
    </OpenOnClick>
  );
}

/**
 * A bid package and the quotes against it.
 *
 * The quotes are the package's whole point, so they stay on the card rather than
 * behind it — sorted cheapest first, with the low bid marked and anything over
 * budget coloured. Exclusions sit against the price because they are why the
 * cheapest bid is so often not the cheapest job.
 */
export function BidPackageCard({ bidPackage }: { bidPackage: BidPackageWithQuotes }) {
  const sorted = [...bidPackage.quotes].sort((a, b) => a.amount - b.amount);
  const low = sorted[0];

  return (
    <OpenOnClick className="card group flex cursor-pointer flex-col p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
            {TRADE_LABELS[bidPackage.trade]}
          </span>
          <h3 className="mt-0.5 font-semibold leading-snug tracking-tight group-hover:text-brand-700">
            {bidPackage.name}
          </h3>
        </div>
        <span className="flex items-center gap-2">
          <StatusPill kind="bid" value={bidPackage.status} />
          <EditBidPackageForm bidPackage={bidPackage} />
        </span>
      </div>

      {bidPackage.scope_description && (
        <p className="mt-2 text-sm text-ink-muted">{bidPackage.scope_description}</p>
      )}
      <p className="mt-1 text-xs text-ink-subtle">
        {bidPackage.project.name}
        {bidPackage.due_at && ` · bids due ${formatDate(bidPackage.due_at)}`}
      </p>

      <div className="mt-3 flex items-baseline justify-between gap-3 rounded-tile bg-canvas px-3 py-2">
        <span className="text-xs text-ink-muted">Budget</span>
        <span className="font-semibold tabular-nums">
          {bidPackage.budget ? formatCurrency(bidPackage.budget) : "—"}
        </span>
      </div>

      {sorted.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {sorted.map((quote) => {
            const overBudget = bidPackage.budget !== null && quote.amount > bidPackage.budget;
            return (
              <li key={quote.id}>
                {/* Its own scope, so clicking a quote opens the quote rather
                    than the package it sits inside. */}
                <OpenOnClick className="flex cursor-pointer flex-wrap items-center gap-2 py-2.5">
                  <div className="min-w-32 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-medium">{quote.subcontractor.company_name}</p>
                      {quote.id === low?.id && sorted.length > 1 && <Pill tone="info">Low bid</Pill>}
                      <StatusPill kind="offer" value={quote.status} />
                    </div>
                    {quote.exclusions && (
                      <p className="text-xs text-ink-subtle">{quote.exclusions}</p>
                    )}
                  </div>
                  <EditQuoteForm quote={quote} />
                  <p
                    className={`shrink-0 font-semibold tabular-nums ${
                      overBudget ? "text-status-behind-ink" : ""
                    }`}
                  >
                    {formatCurrency(quote.amount)}
                  </p>
                </OpenOnClick>
              </li>
            );
          })}
        </ul>
      )}
    </OpenOnClick>
  );
}

/**
 * A subcontractor.
 *
 * Insurance is the field that decides whether they can be on site at all, so it
 * is a pill rather than a date in a list — and "none on file" is red alongside
 * "expired", because both mean the same thing on the day it matters.
 */
export function SubcontractorCard({
  sub,
  today,
}: {
  sub: Subcontractor;
  today: Date;
}) {
  const expires = sub.insurance_expires_at ? new Date(sub.insurance_expires_at) : null;
  const days = expires ? (expires.getTime() - today.getTime()) / 86_400_000 : null;

  return (
    <OpenOnClick className="card group flex cursor-pointer flex-col p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold tracking-tight group-hover:text-brand-700">
            {sub.company_name}
          </h3>
          <p className="text-sm text-ink-muted">{TRADE_LABELS[sub.trade]}</p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          {sub.rating !== null && (
            <span className="flex items-center gap-1 text-sm font-medium tabular-nums">
              <Star className="size-3.5 fill-current text-status-behind-ink" />
              {sub.rating.toFixed(1)}
            </span>
          )}
          <EditSubcontractorForm subcontractor={sub} />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {sub.is_approved ? <Pill tone="good">Approved</Pill> : <Pill tone="warn">Not approved</Pill>}
        {days === null ? (
          <Pill tone="bad">No insurance on file</Pill>
        ) : days < 0 ? (
          <Pill tone="bad">Insurance expired</Pill>
        ) : days < INSURANCE_WARNING_DAYS ? (
          <Pill tone="warn">Insurance expires {formatDate(sub.insurance_expires_at!)}</Pill>
        ) : (
          <Pill tone="neutral">Insured to {formatDate(sub.insurance_expires_at!)}</Pill>
        )}
      </div>

      {sub.contact_name && (
        <p className="mt-3 text-xs text-ink-subtle">
          {sub.contact_name}
          {sub.phone && ` · ${sub.phone}`}
        </p>
      )}
    </OpenOnClick>
  );
}
