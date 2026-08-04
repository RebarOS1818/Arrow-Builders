import "server-only";

import { createClient } from "@/lib/supabase/server";

export type BillingOrg = {
  id: string;
  name: string;
  email: string | null;
  sola_customer_id: string | null;
  sola_payment_method_id: string | null;
  sola_schedule_id: string | null;
};

export type CallerResult =
  | { ok: true; org: BillingOrg }
  | { ok: false; error: string; status: number };

/**
 * The organization the signed-in caller administers.
 *
 * The org is read from the caller's own profile, never from the request body —
 * a body-supplied org_id would let any signed-in user attach a card to, or
 * cancel, somebody else's billing.
 */
export async function billingCaller(): Promise<CallerResult> {
  const db = await createClient();
  if (!db) return { ok: false, error: "Billing is not configured.", status: 503 };

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in.", status: 401 };

  const { data: profile } = await db
    .from("profiles")
    .select("org_id, is_admin")
    .eq("id", user.id)
    .single();

  const orgId = (profile as { org_id: string | null } | null)?.org_id;
  const isAdmin = Boolean((profile as { is_admin: boolean } | null)?.is_admin);

  if (!orgId) return { ok: false, error: "No organization.", status: 400 };
  if (!isAdmin) return { ok: false, error: "Only admins can manage billing.", status: 403 };

  const { data: org, error } = await db
    .from("organizations")
    .select("id, name, sola_customer_id, sola_payment_method_id, sola_schedule_id")
    .eq("id", orgId)
    .single();

  if (error) {
    // The usual cause is migration 0012 not having been run. Named, because
    // "Something went wrong" would send someone looking in the wrong place.
    const missing = error.message.includes("sola_");
    return {
      ok: false,
      status: 503,
      error: missing
        ? "The Sola billing columns are missing. Run supabase/migrations/0012_sola_billing.sql."
        : `Could not read your organization: ${error.message}`,
    };
  }

  return {
    ok: true,
    org: { ...(org as Omit<BillingOrg, "email">), email: user.email ?? null },
  };
}
