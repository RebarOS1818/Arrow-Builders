import "server-only";

import { SUPABASE_SERVICE_ROLE_KEY as SERVICE_ROLE_KEY } from "../supabase/server-config";

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

/**
 * Recurring flat-fee Price created in the Stripe dashboard. Set an
 * `included_seats` metadata key on it to override the user allowance below.
 */
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? "";

/**
 * Users the plan allows, when the Stripe Price does not say otherwise.
 *
 * Billing is a flat monthly fee for up to this many users, not a per-seat
 * charge — the Stripe quantity is always 1.
 */
export const INCLUDED_SEATS = 50;

/** Users allowed before subscribing, and after a subscription ends. */
export const FREE_SEATS = 3;

// Shared with invite email delivery, so it lives with the other Supabase config.
export { SUPABASE_SERVICE_ROLE_KEY } from "../supabase/server-config";


export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/**
 * Every variable the full charge-and-record loop needs.
 *
 * The webhook secret and service-role key are part of readiness, not optional
 * extras: without them a customer can complete Checkout and be charged while
 * /api/stripe/webhook answers 503, so the subscription is never recorded and the
 * app still believes the org has no plan. Refusing to start checkout is the only
 * honest failure mode.
 */
const REQUIRED_ENV = {
  STRIPE_SECRET_KEY,
  STRIPE_PRICE_ID,
  STRIPE_WEBHOOK_SECRET,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
} as const;

/** Names of the variables still unset, for a precise setup message. */
export const missingStripeEnv = Object.entries(REQUIRED_ENV)
  .filter(([, value]) => !value)
  .map(([name]) => name);

/**
 * Billing stays inert until every variable is present, so the app keeps running
 * on demo data and self-hosted installs that do not charge anyone.
 */
export const isStripeConfigured = missingStripeEnv.length === 0;
