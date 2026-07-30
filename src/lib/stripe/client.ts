import "server-only";

import Stripe from "stripe";
import { STRIPE_SECRET_KEY, isStripeConfigured } from "./config";

let cached: Stripe | null = null;

/** Returns null when Stripe is not configured, so callers can degrade quietly. */
export function getStripe(): Stripe | null {
  if (!isStripeConfigured) return null;
  // Pinned to the version this SDK's types were generated against, so runtime
  // responses and compile-time types can never drift apart.
  cached ??= new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-07-29.dahlia" });
  return cached;
}
