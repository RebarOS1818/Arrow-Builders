import "server-only";

import { sola } from "./client";
import { planByAmountCents } from "./plans";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/lib/billing";

type ScheduleView = {
  IsActive?: boolean;
  Amount?: string | number;
  NextScheduledRunTime?: string;
  PaymentsProcessed?: number;
  LastTransactionStatus?: string;
};

export type Reconciled = {
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  priceCents: number | null;
  plan: string | null;
  seatLimit: number | null;
};

/**
 * Reads the schedule back from Sola and makes the stored billing state agree
 * with it.
 *
 * This exists because the webhook cannot be relied on. Sola's published field
 * list documents a card transaction and never states what a *recurring* run
 * sends — and the first live subscription produced no webhook delivery at all.
 * Without something that asks, a declined renewal next month would leave an
 * organization reading `active` forever while the gateway quietly stopped
 * collecting. That is the worst failure this system can have: invisible, and
 * wrong in the customer's favour in a way nobody discovers for months.
 *
 * Pulling on read is not as immediate as a push, but it is correct without
 * depending on a delivery mechanism that has not been observed working. If the
 * webhook does turn out to fire, the two agree and this becomes a cheap
 * confirmation rather than the only source of truth.
 *
 * Never throws. Billing state that could not be refreshed is a worse page than
 * a slightly stale one, but a page that will not render at all is worse still.
 */
export async function reconcileSchedule(
  orgId: string,
  scheduleId: string,
): Promise<Reconciled | null> {
  const result = await sola<ScheduleView>("GetSchedule", { ScheduleId: scheduleId });
  if (!result.ok) return null;

  const s = result.data;

  const last = (s.LastTransactionStatus ?? "").toLowerCase();
  const failed = last.includes("declin") || last.includes("error");

  // A disabled schedule is a cancelled subscription, however it was disabled —
  // including from the Sola portal, which this app would otherwise never learn
  // about. `past_due` rather than a lockout on a failed payment, matching the
  // Stripe path: a bad card is a dunning problem, not a reason to stop a crew
  // working mid-job.
  const status: SubscriptionStatus = !s.IsActive ? "canceled" : failed ? "past_due" : "active";

  const amountCents =
    s.Amount === undefined || s.Amount === null
      ? null
      : Math.round(Number.parseFloat(String(s.Amount)) * 100);
  const priceCents = amountCents !== null && Number.isFinite(amountCents) ? amountCents : null;

  const nextRun = s.NextScheduledRunTime ? new Date(s.NextScheduledRunTime) : null;
  const currentPeriodEnd =
    nextRun && !Number.isNaN(nextRun.getTime()) ? nextRun.toISOString() : null;

  // The plan is only inferred when the amount matches one we sell. A negotiated
  // amount set in the portal would otherwise be filed under whichever plan came
  // closest, and take the customer's seat limit with it.
  const plan = priceCents === null ? undefined : planByAmountCents(priceCents);

  const view: Reconciled = {
    status,
    currentPeriodEnd,
    priceCents,
    plan: plan?.key ?? null,
    seatLimit: plan?.includedSeats ?? null,
  };

  // Written back so everything that reads the organization directly — seat
  // limits, entitlement, the invite trigger in the database — sees the same
  // answer as the billing page, rather than only the page being right.
  const db = createAdminClient();
  if (db) {
    await db
      .from("organizations")
      .update({
        subscription_status: status,
        ...(currentPeriodEnd ? { current_period_end: currentPeriodEnd } : {}),
        ...(priceCents === null ? {} : { price_cents: priceCents }),
        ...(plan ? { plan: plan.key, seat_limit: plan.includedSeats } : {}),
      })
      .eq("id", orgId);
  }

  return view;
}
