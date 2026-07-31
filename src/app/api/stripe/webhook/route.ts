import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { FREE_SEATS, INCLUDED_SEATS, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/config";
import { tierByPriceId } from "@/lib/stripe/tiers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe's status set, mapped to our enum. Anything unrecognised — a status
 * Stripe adds later — becomes 'incomplete' rather than being written through,
 * because an invalid enum value would 500 this handler and put Stripe into an
 * endless retry loop with the stored billing state frozen.
 */
const STATUS_MAP: Record<string, string> = {
  incomplete: "incomplete",
  incomplete_expired: "incomplete_expired",
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
  unpaid: "unpaid",
  paused: "paused",
};

function statusOf(subscription: Stripe.Subscription): string {
  return STATUS_MAP[subscription.status] ?? "incomplete";
}

/**
 * The 2026 API moved period boundaries onto subscription items. Read the item
 * first and fall back to the legacy top-level field so either shape works.
 */
function periodEnd(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0] as { current_period_end?: number } | undefined;
  const legacy = (subscription as unknown as { current_period_end?: number }).current_period_end;
  const seconds = item?.current_period_end ?? legacy;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

/**
 * Users the plan includes.
 *
 * Deliberately NOT the subscription quantity. Billing is a flat fee, so the
 * quantity is always 1 — reading it here would set every paying customer's
 * ceiling to a single user. The allowance lives in the Price's `included_seats`
 * metadata so it can differ per client without a deploy, and falls back to the
 * configured bundle when a Price has no metadata set.
 */
async function includedSeats(
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<number> {
  const price = subscription.items.data[0]?.price;
  let raw = price?.metadata?.included_seats;

  // Fall back to the Product's metadata, matching what the pricing cards do.
  // The Price is the right home for this, but Stripe's dashboard surfaces the
  // Product's metadata panel far more prominently, so that is where it tends to
  // get typed. The webhook must agree with the cards or the seat limit granted
  // would not match the allowance advertised.
  if (!raw && price?.id) {
    try {
      const full = await stripe.prices.retrieve(price.id, { expand: ["product"] });
      const product = full.product;
      if (product && typeof product === "object" && !("deleted" in product)) {
        raw = product.metadata?.included_seats;
      }
    } catch {
      // Leave raw unset; the configured default below is the safe answer.
    }
  }

  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : INCLUDED_SEATS;
}

/**
 * The flat monthly amount Stripe will actually charge. Recorded so the billing
 * page shows the real figure rather than a default compiled into the app.
 */
function priceCentsOf(subscription: Stripe.Subscription): number | null {
  return subscription.items.data[0]?.price?.unit_amount ?? null;
}

/**
 * Which tier was actually bought, derived from the Price on the subscription.
 *
 * Taken from Stripe rather than from whatever the client requested at checkout,
 * so the recorded plan can never disagree with the invoice. An unrecognised
 * Price — one created directly in the dashboard for a negotiated deal — is
 * recorded as enterprise, which is what such a Price almost always is.
 */
function planOf(subscription: Stripe.Subscription): string {
  const priceId = subscription.items.data[0]?.price?.id;
  return tierByPriceId(priceId)?.key ?? "enterprise";
}

function orgIdOf(subscription: Stripe.Subscription): string | null {
  return subscription.metadata?.org_id ?? null;
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const db = createAdminClient();

  if (!stripe || !STRIPE_WEBHOOK_SECRET || !db) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  // Signature verification needs the exact bytes Stripe signed, so read the raw body.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Invalid signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.client_reference_id ?? session.metadata?.org_id;
        if (!orgId || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string" ? session.subscription : session.subscription.id,
        );

        await db
          .from("organizations")
          .update({
            stripe_customer_id:
              typeof session.customer === "string" ? session.customer : session.customer?.id,
            stripe_subscription_id: subscription.id,
            subscription_status: statusOf(subscription),
            seat_limit: await includedSeats(stripe, subscription),
            price_cents: priceCentsOf(subscription) ?? 0,
            current_period_end: periodEnd(subscription),
            plan: planOf(subscription),
          })
          .eq("id", orgId);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = orgIdOf(subscription);

        // Re-read the allowance on every update, so moving a client to a
        // larger Price in the Stripe dashboard raises their ceiling here too.
        const patch = {
          subscription_status: statusOf(subscription),
          seat_limit: await includedSeats(stripe, subscription),
          price_cents: priceCentsOf(subscription) ?? 0,
          // Re-read on every update so an in-app plan change, or one made in
          // the Stripe dashboard, lands in the database the same way.
          plan: planOf(subscription),
          current_period_end: periodEnd(subscription),
          stripe_subscription_id: subscription.id,
        };

        if (orgId) {
          await db.from("organizations").update(patch).eq("id", orgId);
        } else {
          await db.from("organizations").update(patch).eq("stripe_subscription_id", subscription.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = orgIdOf(subscription);

        const patch = {
          subscription_status: "canceled" as const,
          stripe_subscription_id: null,
          seat_limit: FREE_SEATS,
          price_cents: 0,
          current_period_end: periodEnd(subscription),
          plan: "starter",
        };

        if (orgId) {
          await db.from("organizations").update(patch).eq("id", orgId);
        } else {
          await db.from("organizations").update(patch).eq("stripe_subscription_id", subscription.id);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await db
            .from("organizations")
            .update({ subscription_status: "past_due" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged so Stripe stops retrying them.
        break;
    }
  } catch (cause) {
    // Returning 500 makes Stripe retry, which is what we want for a transient
    // database failure. The signature already proved the event is genuine.
    const message = cause instanceof Error ? cause.message : "Handler failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
