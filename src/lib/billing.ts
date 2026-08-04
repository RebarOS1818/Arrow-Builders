import "server-only";

import { createClient } from "./supabase/server";
import { DEMO_ORG, demoProfiles } from "./demo-data";
import { isStripeConfigured, missingStripeEnv } from "./stripe/config";
import { SALES_EMAIL, TIERS, isSelfServe } from "./stripe/tiers";
import { resolveTiers, type ResolvedTier } from "./stripe/tier-prices";
import {
  SOLA_IFIELDS_KEY,
  SOLA_IFIELDS_VERSION,
  SOLA_SOFTWARE_NAME,
  SOLA_SOFTWARE_VERSION,
  isSolaConfigured,
  missingSolaEnv,
  solaKeysLookSwapped,
} from "./sola/config";
import { SOLA_PLANS, isSelfServe as isSolaSelfServe } from "./sola/plans";
import { reconcileSchedule } from "./sola/reconcile";

/**
 * Which gateway takes the money.
 *
 * Sola wins when both are configured: it is the one being moved to, and a page
 * offering two ways to pay would let a customer start a second subscription
 * while the first was still collecting. "none" means nothing is configured, and
 * the page shows illustrative figures with every button disabled.
 */
export type Processor = "sola" | "stripe" | "none";

export const processor: Processor = isSolaConfigured
  ? "sola"
  : isStripeConfigured
    ? "stripe"
    : "none";

/** Everything the browser needs to render Sola's card form. No secrets. */
export type SolaBrowserConfig = {
  ifieldsKey: string;
  ifieldsVersion: string;
  softwareName: string;
  softwareVersion: string;
};

/** Mirrors the subscription_status enum: Stripe's full set plus our "none". */
export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

/** A plan as the pricing cards need it, whichever processor priced it. */
export type PlanCard = {
  key: string;
  name: string;
  tagline: string;
  includedSeats: number;
  listPriceCents: number | null;
  highlights: string[];
  /** Why it cannot be bought right now, if it cannot. */
  unavailable?: string;
};

export type BillingSummary = {
  orgId: string;
  orgName: string;
  plan: string;
  seatLimit: number;
  seatsUsed: number;
  seatsAvailable: number;
  members: number;
  pendingInvites: number;
  /** Flat monthly fee for the whole organization. */
  priceCents: number;
  monthlyTotalCents: number;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  hasSubscription: boolean;
  /**
   * Admin of the organization. Governs inviting and seat management, which are
   * useful with or without a payment processor.
   */
  isAdmin: boolean;
  /**
   * Billing *actions* (checkout, portal) additionally need Stripe configured.
   * Kept separate from isAdmin so an unconfigured install still manages its team.
   */
  canManage: boolean;
  /** Which gateway is live, so the page knows which endpoints to call. */
  processor: Processor;
  billingReady: boolean;
  /** Env vars still missing, so the billing page can name them exactly. */
  missingEnv: string[];
  /**
   * Warnings that are not "unset" but are still wrong — a secret pasted into a
   * public variable, say. Worth its own field because such an install passes
   * the readiness check and would otherwise look fine.
   */
  configWarnings: string[];
  /** Present only when Sola is the processor. */
  sola: SolaBrowserConfig | null;
  /**
   * Set when the organization row could not be read. Everything derived from it
   * is meaningless in that case, so the page must say so rather than render the
   * zeros — "up to 0 users" reads as a plan, not as a broken query.
   */
  loadError: string | null;
  /** Plans on offer. Priced by the live processor. */
  tiers: PlanCard[];
  /** Which of them can be bought without talking to someone. */
  selfServe: Record<string, boolean>;
  /** Where the non-self-serve tier points. Empty means show no link. */
  salesEmail: string;
};

/**
 * Statuses that should still grant access. `past_due` is included deliberately —
 * a failed card is a dunning problem, not a reason to lock a crew out mid-job.
 * `unpaid` is where Stripe gives up on retries, so access stops there.
 */
export function isEntitled(status: SubscriptionStatus) {
  return status === "active" || status === "trialing" || status === "past_due";
}

/**
 * The plans, priced by whichever gateway is live.
 *
 * Stripe's prices are read from Stripe; Sola has no catalogue to read, so its
 * plans carry their own amounts. Everything below this call is processor-blind,
 * which is what keeps the billing page from growing a second copy of itself.
 */
async function offer(): Promise<Pick<BillingSummary, "tiers" | "selfServe">> {
  if (processor === "sola") {
    return {
      tiers: SOLA_PLANS,
      selfServe: Object.fromEntries(SOLA_PLANS.map((p) => [p.key, isSolaSelfServe(p)])),
    };
  }
  const tiers: ResolvedTier[] = processor === "stripe" ? await resolveTiers() : TIERS;
  return {
    tiers,
    selfServe: Object.fromEntries(TIERS.map((t) => [t.key, isSelfServe(t)])),
  };
}

/** Config the browser needs, and complaints about the config it has. */
function setup(): Pick<BillingSummary, "processor" | "billingReady" | "missingEnv" | "configWarnings" | "sola"> {
  const warnings = solaKeysLookSwapped
    ? [
        "NEXT_PUBLIC_SOLA_IFIELDS_KEY does not start with 'ifields_'. If the API key was pasted there it is being served to every visitor — rotate it.",
      ]
    : [];

  return {
    processor,
    billingReady: processor !== "none",
    // Named for the gateway being set up. Reporting Stripe's missing variables
    // to someone configuring Sola is how a setup message sends you to the wrong
    // dashboard for an afternoon.
    missingEnv: processor === "sola" || missingSolaEnv.length < missingStripeEnv.length
      ? missingSolaEnv
      : missingStripeEnv,
    configWarnings: warnings,
    sola:
      processor === "sola"
        ? {
            ifieldsKey: SOLA_IFIELDS_KEY,
            ifieldsVersion: SOLA_IFIELDS_VERSION,
            softwareName: SOLA_SOFTWARE_NAME,
            softwareVersion: SOLA_SOFTWARE_VERSION,
          }
        : null,
  };
}

export async function getBillingSummary(): Promise<BillingSummary> {
  const db = await createClient();

  if (!db) {
    // Demo mode: report a plausible starter plan so the page is inspectable.
    const members = demoProfiles.length;
    const seatLimit = 10;
    return {
      orgId: DEMO_ORG.id,
      orgName: DEMO_ORG.name,
      plan: "starter",
      seatLimit,
      seatsUsed: members,
      seatsAvailable: Math.max(0, seatLimit - members),
      members,
      pendingInvites: 0,
      priceCents: 2900,
      monthlyTotalCents: 2900,
      status: "none",
      currentPeriodEnd: null,
      hasSubscription: false,
      isAdmin: false,
      canManage: false,
      ...setup(),
      loadError: null,
      ...(await offer()),
      salesEmail: SALES_EMAIL,
    };
  }

  const {
    data: { user },
  } = await db.auth.getUser();

  const { data: profile } = await db
    .from("profiles")
    .select("org_id, is_admin")
    .eq("id", user?.id ?? "")
    .single();

  const orgId = (profile as { org_id: string | null } | null)?.org_id ?? "";
  const isAdmin = Boolean((profile as { is_admin: boolean } | null)?.is_admin);

  // sola_schedule_id is only asked for when Sola is live: on a Stripe install
  // that has not run migration 0012 the column does not exist, and naming it
  // unconditionally would fail the whole read and blank the billing page.
  const columns =
    "id, name, plan, seat_limit, price_cents, subscription_status, stripe_subscription_id, current_period_end" +
    (processor === "sola" ? ", sola_schedule_id" : "");

  const [org, memberCount, inviteCount] = await Promise.all([
    db
      .from("organizations")
      .select(columns)
      .eq("id", orgId)
      .single(),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    db
      .from("org_invites")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .is("accepted_at", null)
      .is("revoked_at", null),
  ]);

  // A failed read is not an empty plan. Surfaced rather than swallowed: the
  // usual cause is a migration that has not been run, and silently substituting
  // zeros hides that behind numbers that look deliberate.
  const loadError = org.error
    ? org.error.message.includes("sola_")
      ? "The Sola billing columns are missing from the database. Run supabase/migrations/0012_sola_billing.sql."
      : org.error.message.includes("price_cents")
        ? "The billing columns are missing from the database. Run supabase/migrations/0006_flat_fee.sql."
        : `Could not read your organization: ${org.error.message}`
    : null;

  const row = org.data as unknown as {
    id: string;
    name: string;
    plan: string;
    seat_limit: number;
    price_cents: number;
    subscription_status: SubscriptionStatus;
    stripe_subscription_id: string | null;
    sola_schedule_id?: string | null;
    current_period_end: string | null;
  } | null;

  // Ask Sola what the schedule actually says, rather than trusting what was
  // written when it was created. Sola's first live subscription produced no
  // webhook delivery at all, so without this a declined renewal would leave the
  // organization reading `active` indefinitely while the gateway had stopped
  // collecting. Best effort — a failed read leaves the stored values in place.
  const live =
    processor === "sola" && row?.sola_schedule_id
      ? await reconcileSchedule(row.id, row.sola_schedule_id)
      : null;

  const members = memberCount.count ?? 0;
  const pendingInvites = inviteCount.count ?? 0;
  const seatsUsed = members + pendingInvites;
  const seatLimit = live?.seatLimit ?? row?.seat_limit ?? 0;
  // 0 means no price has been recorded yet — shown as unknown, not free.
  const priceCents = live?.priceCents ?? row?.price_cents ?? 0;

  return {
    orgId: row?.id ?? orgId,
    orgName: row?.name ?? "Your organization",
    plan: live?.plan ?? row?.plan ?? "starter",
    seatLimit,
    seatsUsed,
    seatsAvailable: Math.max(0, seatLimit - seatsUsed),
    members,
    pendingInvites,
    priceCents,
    // Flat fee: the bill does not move with head count, only with the plan.
    monthlyTotalCents: priceCents,
    status: live?.status ?? row?.subscription_status ?? "none",
    currentPeriodEnd: live?.currentPeriodEnd ?? row?.current_period_end ?? null,
    // Whichever gateway is live decides what counts as subscribed. Reading both
    // would show a Sola customer the "change plan" buttons for a Stripe
    // subscription they no longer have.
    hasSubscription: Boolean(
      processor === "sola"
        ? // A schedule disabled in the Sola portal rather than through the app
          // is no longer a subscription, whatever our column still says — and
          // continuing to offer "Cancel subscription" for it would be a button
          // that could only fail.
          row?.sola_schedule_id && live?.status !== "canceled"
        : row?.stripe_subscription_id,
    ),
    isAdmin,
    canManage: isAdmin && processor !== "none",
    ...setup(),
    loadError,
    ...(await offer()),
    salesEmail: SALES_EMAIL,
  };
}

export function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
