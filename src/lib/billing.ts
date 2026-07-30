import "server-only";

import { createClient } from "./supabase/server";
import { DEMO_ORG, demoProfiles } from "./demo-data";
import { isStripeConfigured, missingStripeEnv } from "./stripe/config";

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

export type BillingSummary = {
  orgId: string;
  orgName: string;
  plan: string;
  seatLimit: number;
  seatsUsed: number;
  seatsAvailable: number;
  members: number;
  pendingInvites: number;
  pricePerSeatCents: number;
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
  stripeReady: boolean;
  /** Env vars still missing, so the billing page can name them exactly. */
  missingEnv: string[];
};

/**
 * Statuses that should still grant access. `past_due` is included deliberately —
 * a failed card is a dunning problem, not a reason to lock a crew out mid-job.
 * `unpaid` is where Stripe gives up on retries, so access stops there.
 */
export function isEntitled(status: SubscriptionStatus) {
  return status === "active" || status === "trialing" || status === "past_due";
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
      pricePerSeatCents: 2900,
      monthlyTotalCents: 2900 * members,
      status: "none",
      currentPeriodEnd: null,
      hasSubscription: false,
      isAdmin: false,
      canManage: false,
      stripeReady: false,
      missingEnv: missingStripeEnv,
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

  const [org, memberCount, inviteCount] = await Promise.all([
    db
      .from("organizations")
      .select(
        "id, name, plan, seat_limit, price_per_seat_cents, subscription_status, stripe_subscription_id, current_period_end",
      )
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

  const row = org.data as {
    id: string;
    name: string;
    plan: string;
    seat_limit: number;
    price_per_seat_cents: number;
    subscription_status: SubscriptionStatus;
    stripe_subscription_id: string | null;
    current_period_end: string | null;
  } | null;

  const members = memberCount.count ?? 0;
  const pendingInvites = inviteCount.count ?? 0;
  const seatsUsed = members + pendingInvites;
  const seatLimit = row?.seat_limit ?? 0;
  const pricePerSeatCents = row?.price_per_seat_cents ?? 2900;

  return {
    orgId: row?.id ?? orgId,
    orgName: row?.name ?? "Your organization",
    plan: row?.plan ?? "starter",
    seatLimit,
    seatsUsed,
    seatsAvailable: Math.max(0, seatLimit - seatsUsed),
    members,
    pendingInvites,
    pricePerSeatCents,
    // Billed on seats occupied, which is what the Stripe quantity tracks.
    monthlyTotalCents: pricePerSeatCents * seatsUsed,
    status: row?.subscription_status ?? "none",
    currentPeriodEnd: row?.current_period_end ?? null,
    hasSubscription: Boolean(row?.stripe_subscription_id),
    isAdmin,
    canManage: isAdmin && isStripeConfigured,
    stripeReady: isStripeConfigured,
    missingEnv: missingStripeEnv,
  };
}

export function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
