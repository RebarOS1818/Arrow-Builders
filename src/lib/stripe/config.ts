import "server-only";

import { SUPABASE_SERVICE_ROLE_KEY as SERVICE_ROLE_KEY } from "../supabase/server-config";
import { selfServeTiers } from "./tiers";

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

/**
 * Per-tier Prices live in ./tiers. At least one self-serve tier must have a
 * Price or nothing can be bought, which is what readiness below checks.
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


/**
 * Coerces a configured host into an absolute origin.
 *
 * Stripe rejects a success_url without a scheme with the unhelpful message
 * "Not a valid URL", and `NEXT_PUBLIC_APP_URL=arrow-builders.vercel.app` is the
 * easy mistake to make — VERCEL_URL is stored exactly that way, so copying its
 * shape looks right. Adding the scheme here turns a dead checkout button into
 * a working one.
 */
function toOrigin(raw: string | undefined): string | null {
  const trimmed = raw?.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  const absolute = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(absolute).origin;
  } catch {
    return null;
  }
}

export const APP_URL =
  toOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
  toOrigin(process.env.VERCEL_URL) ??
  "http://localhost:3000";

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
  STRIPE_WEBHOOK_SECRET,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
  // Named for the variable a fresh install would set. Starter also accepts the
  // unsuffixed STRIPE_PRICE_ID, so an existing single-plan install stays ready.
  STRIPE_PRICE_ID_STARTER: selfServeTiers().length > 0 ? "set" : "",
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
