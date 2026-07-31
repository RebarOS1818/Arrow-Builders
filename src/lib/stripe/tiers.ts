import "server-only";

/**
 * The plans on offer, in display order.
 *
 * A tier is defined here but *priced* in Stripe: the amount and the user
 * allowance both come from the Price at runtime, so changing either is a
 * dashboard edit rather than a deploy. The figures in this file are only the
 * fallback used before a subscription exists, and the copy on the cards.
 *
 * Enterprise is deliberately not self-serve. It has no Price, so it cannot be
 * bought through Checkout — it shows a contact link instead, and you set the
 * organization's plan and seat_limit yourself once a deal is agreed.
 */
export type TierKey = "starter" | "premium" | "enterprise";

export type Tier = {
  key: TierKey;
  name: string;
  tagline: string;
  /** Stripe Price ID. Empty for tiers that are not self-serve. */
  priceId: string;
  /** Shown before checkout, and used when a Price carries no included_seats. */
  includedSeats: number;
  /** Displayed price in cents, superseded by the real Stripe amount once subscribed. */
  listPriceCents: number | null;
  highlights: string[];
};

/**
 * STRIPE_PRICE_ID (unsuffixed) is accepted for Starter so an existing
 * single-plan install keeps working after this change without touching Vercel.
 */
const STARTER_PRICE =
  process.env.STRIPE_PRICE_ID_STARTER ?? process.env.STRIPE_PRICE_ID ?? "";
const PREMIUM_PRICE = process.env.STRIPE_PRICE_ID_PREMIUM ?? "";

/** Where the Enterprise card points. Without it the card shows no link. */
export const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL ?? "";

export const TIERS: Tier[] = [
  {
    key: "starter",
    name: "Starter",
    tagline: "For a single crew getting organised.",
    priceId: STARTER_PRICE,
    includedSeats: 10,
    listPriceCents: 2900,
    highlights: ["All projects and scheduling", "Email invites"],
  },
  {
    key: "premium",
    name: "Premium",
    tagline: "For a growing contractor running several jobs.",
    priceId: PREMIUM_PRICE,
    includedSeats: 50,
    listPriceCents: 9900,
    highlights: ["Everything in Starter", "Priority support"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    tagline: "For multi-division builders. Priced per agreement.",
    priceId: "",
    includedSeats: 250,
    listPriceCents: null,
    highlights: ["Everything in Premium", "Onboarding and SLA"],
  },
];

export const isSelfServe = (tier: Tier) => Boolean(tier.priceId);

export function tierByKey(key: string): Tier | undefined {
  return TIERS.find((tier) => tier.key === key);
}

/**
 * Maps a Stripe Price back to a tier, so the webhook can record which plan was
 * actually bought rather than trusting whatever the client asked for.
 */
export function tierByPriceId(priceId: string | null | undefined): Tier | undefined {
  if (!priceId) return undefined;
  return TIERS.find((tier) => tier.priceId && tier.priceId === priceId);
}

/** Tiers that can be bought without talking to a human. */
export const selfServeTiers = () => TIERS.filter(isSelfServe);
