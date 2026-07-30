"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { syncSeatQuantity } from "@/lib/stripe/seats";

export type InviteResult =
  | { ok: true; seatsAvailable: number }
  | { ok: false; error: string; needsSeats?: boolean };

/**
 * Invites a member, refusing once the plan's seats are full. The database
 * enforces the same rule with a trigger, so this check is the friendly message
 * rather than the actual guarantee.
 */
export async function inviteMember(email: string, role: string): Promise<InviteResult> {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const db = await createClient();
  if (!db) return { ok: false, error: "Connect Supabase to invite members." };

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await db
    .from("profiles")
    .select("org_id, is_admin")
    .eq("id", user.id)
    .single();

  const orgId = (profile as { org_id: string | null } | null)?.org_id;
  if (!orgId) return { ok: false, error: "Your account has no organization." };
  if (!(profile as { is_admin: boolean } | null)?.is_admin) {
    return { ok: false, error: "Only admins can invite members." };
  }

  const { data: available, error: seatError } = await db.rpc("org_seats_available", {
    target_org: orgId,
  });

  if (seatError) return { ok: false, error: seatError.message };

  if ((available ?? 0) <= 0) {
    return {
      ok: false,
      needsSeats: true,
      error: "All seats on your plan are in use. Add seats to invite more people.",
    };
  }

  const { error } = await db.from("org_invites").insert({
    org_id: orgId,
    email: trimmed,
    role,
    invited_by: user.id,
  });

  if (error) {
    // The seat trigger raises check_violation if the count changed underneath us.
    if (error.code === "23514" || error.message.includes("seat limit")) {
      return { ok: false, needsSeats: true, error: "All seats on your plan are in use." };
    }
    if (error.code === "23505" || error.code === "23000") {
      return { ok: false, error: "That address already has a pending invite." };
    }
    return { ok: false, error: error.message };
  }

  await pushSeatCount(orgId);

  revalidatePath("/teams");
  revalidatePath("/billing");
  return { ok: true, seatsAvailable: Math.max(0, (available ?? 1) - 1) };
}

export async function revokeInvite(inviteId: string): Promise<InviteResult> {
  const db = await createClient();
  if (!db) return { ok: false, error: "Connect Supabase to manage invites." };

  const { data: invite, error } = await db
    .from("org_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .is("accepted_at", null)
    .select("org_id")
    .single();

  if (error) return { ok: false, error: error.message };

  const orgId = (invite as { org_id: string } | null)?.org_id;
  if (orgId) await pushSeatCount(orgId);

  revalidatePath("/teams");
  revalidatePath("/billing");
  return { ok: true, seatsAvailable: 0 };
}

/** Keeps the Stripe subscription quantity equal to seats in use. */
async function pushSeatCount(orgId: string) {
  const stripe = getStripe();
  if (!stripe) return;

  const db = await createClient();
  if (!db) return;

  const { data: org } = await db
    .from("organizations")
    .select("stripe_subscription_id")
    .eq("id", orgId)
    .single();

  const subscriptionId = (org as { stripe_subscription_id: string | null } | null)
    ?.stripe_subscription_id;
  if (!subscriptionId) return;

  const { data: used } = await db.rpc("org_seats_used", { target_org: orgId });
  if (typeof used === "number") {
    try {
      await syncSeatQuantity(subscriptionId, used);
    } catch {
      // A failed sync must not fail the invite; the webhook reconciles on the
      // next subscription event, and the billing page always recomputes usage.
    }
  }
}
