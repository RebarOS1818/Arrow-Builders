import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";
import { SUPABASE_SERVICE_ROLE_KEY } from "../stripe/config";

/**
 * Service-role client. Bypasses RLS, so it is only for trusted server paths with
 * no user session — currently just the Stripe webhook writing billing state.
 * Never import this into anything that renders.
 */
export function createAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
