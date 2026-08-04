import "server-only";

/**
 * The plans on offer, under Sola.
 *
 * Sola has no product catalogue — a recurring schedule is just an amount and an
 * interval, so there is nothing to look a price up from. The figures here *are*
 * the prices: change one and the next subscriber is charged the new amount,
 * while existing schedules keep the amount they were created with until they
 * are updated.
 *
 * Because of that, the environment variables are the amounts themselves rather
 * than price identifiers, so a price change is still a dashboard edit in Vercel
 * rather than a deploy.
 */
export type SolaPlanKey = "starter" | "premium" | "enterprise";

export type SolaPlan = {
  key: SolaPlanKey;
  name: string;
  tagline: string;
  includedSeats: number;
  /** Monthly amount in cents. Null means "not self-serve" — talk to us. */
  listPriceCents: number | null;
  highlights: string[];
};

/**
 * Reads a price override, ignoring anything that is not a positive whole number
 * of cents. A typo like "29.00" would otherwise become a schedule that charges
 * 29 cents a month, and nothing downstream would notice.
 */
function priceFromEnv(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function seatsFromEnv(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL ?? "";

export const SOLA_PLANS: SolaPlan[] = [
  {
    key: "starter",
    name: "Starter",
    tagline: "For a single crew getting organised.",
    includedSeats: seatsFromEnv(process.env.SOLA_SEATS_STARTER, 10),
    listPriceCents: priceFromEnv(process.env.SOLA_PRICE_CENTS_STARTER, 2900),
    highlights: ["All projects and scheduling", "Email invites"],
  },
  {
    key: "premium",
    name: "Premium",
    tagline: "For a growing contractor running several jobs.",
    includedSeats: seatsFromEnv(process.env.SOLA_SEATS_PREMIUM, 50),
    listPriceCents: priceFromEnv(process.env.SOLA_PRICE_CENTS_PREMIUM, 9900),
    highlights: ["Everything in Starter", "Priority support"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    tagline: "For multi-division builders. Priced per agreement.",
    includedSeats: seatsFromEnv(process.env.SOLA_SEATS_ENTERPRISE, 250),
    listPriceCents: null,
    highlights: ["Everything in Premium", "Onboarding and SLA"],
  },
];

/** A plan can be bought without talking to anyone only if it has a price. */
export const isSelfServe = (plan: SolaPlan) => plan.listPriceCents !== null;

export function planByKey(key: string): SolaPlan | undefined {
  return SOLA_PLANS.find((plan) => plan.key === key);
}

/**
 * The plan an amount corresponds to, used when reading a schedule back from
 * Sola. Amounts arrive as decimal strings, and two plans priced the same would
 * be indistinguishable — which is a pricing decision, not something this can
 * fix, so the first match wins and the caller keeps the stored plan when there
 * is none.
 */
export function planByAmountCents(cents: number): SolaPlan | undefined {
  return SOLA_PLANS.find((plan) => plan.listPriceCents === cents);
}
