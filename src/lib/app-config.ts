import "server-only";

/**
 * Settings that belong to the product rather than to whoever processes the
 * payments.
 *
 * These lived in the Stripe config until Sola replaced it, which meant invite
 * links and the free-tier allowance were coupled to a payment provider they
 * have nothing to do with. Removing Stripe was the moment to put them
 * somewhere that outlives the next such change.
 */

/**
 * Coerces a configured host into an absolute origin.
 *
 * `NEXT_PUBLIC_APP_URL=arrow-builders.vercel.app` is the easy mistake to make —
 * VERCEL_URL is stored in exactly that shape, so copying it looks right — and a
 * link without a scheme is a broken invite. Adding it here is the difference
 * between an email that works and one that does not.
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

/** Users allowed before subscribing, and after a subscription ends. */
export const FREE_SEATS = 3;
