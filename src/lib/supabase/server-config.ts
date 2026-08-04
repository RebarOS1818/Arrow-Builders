import "server-only";

/**
 * Service-role key. Bypasses RLS entirely, so it must never reach a browser
 * bundle — this module is server-only and deliberately separate from
 * ./config, which is imported by the client.
 *
 * Two server paths use it: the Sola webhook (no user session to act as) and
 * sending invite emails through Supabase Auth's admin API.
 */
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isServiceRoleConfigured = Boolean(SUPABASE_SERVICE_ROLE_KEY);
