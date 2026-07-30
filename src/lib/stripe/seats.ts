import "server-only";

import { getStripe } from "./client";

/**
 * Pushes the organization's occupied seat count to Stripe as the subscription
 * quantity. Called after a member or invite changes, so the invoice always
 * matches what the app is actually granting.
 *
 * Proration is left to Stripe's default behaviour: adding a seat mid-cycle bills
 * the remainder immediately, removing one credits it.
 */
export async function syncSeatQuantity(subscriptionId: string, seats: number) {
  const stripe = getStripe();
  if (!stripe || !subscriptionId) return { ok: false as const, reason: "not_configured" };

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const item = subscription.items.data[0];
  if (!item) return { ok: false as const, reason: "no_subscription_item" };

  // Stripe rejects quantity 0 on a licensed price; keep at least one seat.
  const quantity = Math.max(1, seats);
  if (item.quantity === quantity) return { ok: true as const, quantity, changed: false };

  await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: item.id, quantity }],
    proration_behavior: "create_prorations",
  });

  return { ok: true as const, quantity, changed: true };
}
