"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/stripe/config";
import { isInviteEmailConfigured, sendInviteEmail } from "@/lib/email/invite";

/** Why the invite email did not go out, when it did not. */
export type InviteDelivery =
  | { emailed: true }
  | { emailed: false; reason: "not_configured" | "already_registered" | "failed"; detail?: string };

export type InviteResult =
  | ({ ok: true; inviteUrl: string } & InviteDelivery)
  | { ok: false; error: string; needsSeats?: boolean };

export type RevokeResult = { ok: true } | { ok: false; error: string };

/**
 * Invites a member, refusing once the plan's user limit is reached. The database
 * enforces the same rule with a trigger, so this check is the friendly message
 * rather than the actual guarantee.
 *
 * Returns a redemption link, and emails it when Supabase SMTP is configured.
 * Membership is granted by the token in that link, never by the email address
 * matching — so the invite still works if delivery fails, and knowing an
 * invitee's address grants nothing.
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
    .select("org_id, is_admin, organizations(name)")
    .eq("id", user.id)
    .single();

  const orgId = (profile as { org_id: string | null } | null)?.org_id;
  if (!orgId) return { ok: false, error: "Your account has no organization." };

  const orgName =
    (profile as { organizations?: { name?: string } | null } | null)?.organizations?.name ??
    "your organization";
  if (!(profile as { is_admin: boolean } | null)?.is_admin) {
    return { ok: false, error: "Only admins can invite members." };
  }

  const { data: available, error: seatError } = await db.rpc("org_seats_available");
  if (seatError) return { ok: false, error: seatError.message };

  if ((available ?? 0) <= 0) {
    return {
      ok: false,
      needsSeats: true,
      error: "Your plan\u2019s user limit is reached. Remove someone, or change plan.",
    };
  }

  const { data: invite, error } = await db
    .from("org_invites")
    .insert({ org_id: orgId, email: trimmed, role, invited_by: user.id })
    .select("token")
    .single();

  if (error) {
    // The seat trigger raises check_violation if the count changed underneath us.
    if (error.code === "23514" || error.message.includes("seat limit")) {
      return { ok: false, needsSeats: true, error: "Your plan\u2019s user limit is reached." };
    }
    if (error.code === "23505") {
      return { ok: false, error: "That address already has a pending invite." };
    }
    return { ok: false, error: error.message };
  }

  const token = (invite as { token: string }).token;
  const inviteUrl = `${APP_URL}/invite/${token}`;

  // Delivery is attempted after the row exists, so a mail failure never costs
  // the invite — the admin can still copy the link.
  const delivery = await sendInviteEmail(trimmed, token, orgName);

  revalidatePath("/teams");
  revalidatePath("/billing");

  return delivery.sent
    ? { ok: true, inviteUrl, emailed: true }
    : { ok: true, inviteUrl, emailed: false, reason: delivery.reason, detail: delivery.detail };
}

/** Whether the app can send invite emails at all, for the form's copy. */
export async function canEmailInvites() {
  return isInviteEmailConfigured;
}

export async function revokeInvite(inviteId: string): Promise<RevokeResult> {
  const db = await createClient();
  if (!db) return { ok: false, error: "Connect Supabase to manage invites." };

  // RLS restricts this update to admins of the invite's own organization.
  const { error } = await db
    .from("org_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .is("accepted_at", null)
    .is("revoked_at", null);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/teams");
  revalidatePath("/billing");
  return { ok: true };
}

/** Redeems an invite token for the signed-in user. */
export async function acceptInvite(
  token: string,
): Promise<{ ok: true; org: string } | { ok: false; error: string }> {
  const db = await createClient();
  if (!db) return { ok: false, error: "Connect Supabase to accept invites." };

  const { data, error } = await db.rpc("accept_invite", { invite_token: token });
  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; org?: string; error?: string };
  if (!result?.ok) {
    const messages: Record<string, string> = {
      not_signed_in: "Sign in first, then open the invite link again.",
      invalid_or_used: "This invite is no longer valid. Ask for a fresh link.",
      already_member: "Your account already belongs to an organization.",
    };
    return { ok: false, error: messages[result?.error ?? ""] ?? "Could not accept the invite." };
  }

  revalidatePath("/", "layout");
  return { ok: true, org: result.org ?? "your organization" };
}

