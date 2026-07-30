import "server-only";

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

/** Recurring per-seat price created in the Stripe dashboard. */
export const STRIPE_SEAT_PRICE_ID = process.env.STRIPE_SEAT_PRICE_ID ?? "";

/** Service-role key — webhook writes happen with no user session, so they bypass RLS. */
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/**
 * Billing stays inert until Stripe is configured, so the app keeps running on
 * demo data and self-hosted installs that do not charge anyone.
 */
export const isStripeConfigured = Boolean(STRIPE_SECRET_KEY && STRIPE_SEAT_PRICE_ID);
