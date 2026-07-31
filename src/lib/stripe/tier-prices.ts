import "server-only";

import { getStripe } from "./client";
import { TIERS, type Tier } from "./tiers";

/** A tier with its figures taken from Stripe rather than from the defaults. */
export type ResolvedTier = Tier & {
  /**
   * Why this tier cannot be bought right now, if it cannot. Set when the Price
   * could not be read — a wrong ID, or one belonging to a different Stripe mode
   * or sandbox. Surfaced on the card instead of quietly showing a stale price
   * next to a button that would fail.
   */
  unavailable?: string;
};

/**
 * Fills each tier's price and user allowance in from Stripe.
 *
 * The amount and included_seats live on the Price, so the pricing cards must
 * read them from there. The numbers in tiers.ts are only a fallback for when
 * Stripe is not configured at all — showing them against a live Stripe account
 * would advertise a price nobody is actually charged, which is worse than
 * showing nothing.
 */
export async function resolveTiers(): Promise<ResolvedTier[]> {
  const stripe = getStripe();
  if (!stripe) return TIERS;

  return Promise.all(
    TIERS.map(async (tier): Promise<ResolvedTier> => {
      // Enterprise has no Price by design; nothing to look up.
      if (!tier.priceId) return tier;

      try {
        const price = await stripe.prices.retrieve(tier.priceId);

        if (!price.active) {
          return { ...tier, unavailable: "This plan's price is archived in Stripe." };
        }

        const declared = Number.parseInt(price.metadata?.included_seats ?? "", 10);
        const includedSeats =
          Number.isFinite(declared) && declared > 0 ? declared : tier.includedSeats;

        return {
          ...tier,
          listPriceCents: price.unit_amount ?? tier.listPriceCents,
          includedSeats,
        };
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : "Price could not be read.";
        return { ...tier, unavailable: detail };
      }
    }),
  );
}
