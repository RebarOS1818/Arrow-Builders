import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/server-config";
import { APP_URL } from "@/lib/stripe/config";

export type InviteEmailResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "already_registered" | "failed"; detail?: string };

export const isInviteEmailConfigured = isServiceRoleConfigured;

/**
 * Emails an invite through Supabase Auth's admin invite endpoint, which uses
 * whatever SMTP provider is configured on the project. Sending is delegated
 * rather than done here so mail credentials live in Supabase, not in this app.
 *
 * The magic link signs the recipient in and lands them on /invite/<token>,
 * where redeeming the token is what actually grants membership. The email is
 * only delivery — possession of the token remains the proof of invitation.
 */
export async function sendInviteEmail(
  email: string,
  token: string,
  orgName: string,
): Promise<InviteEmailResult> {
  if (!isInviteEmailConfigured) return { sent: false, reason: "not_configured" };

  const db = createAdminClient();
  if (!db) return { sent: false, reason: "not_configured" };

  try {
    const { error } = await db.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${APP_URL}/invite/${token}`,
      data: { invited_to: orgName },
    });

    if (!error) return { sent: true };

    // Someone who already has an account cannot be "invited" again by Supabase.
    // That is not a failure of the invite itself — the row exists and holds a
    // seat — so it is reported separately and the link is shown instead.
    const alreadyRegistered =
      error.status === 422 ||
      /already been registered|already exists|email_exists/i.test(error.message);

    return {
      sent: false,
      reason: alreadyRegistered ? "already_registered" : "failed",
      detail: error.message,
    };
  } catch (cause) {
    return {
      sent: false,
      reason: "failed",
      detail: cause instanceof Error ? cause.message : "Unknown mail error.",
    };
  }
}
