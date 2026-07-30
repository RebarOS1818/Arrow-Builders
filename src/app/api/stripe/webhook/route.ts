import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";

/** Seat ceiling an organization falls back to once its subscription ends. */
const FREE_SEAT_LIMIT = 3;

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

function seatsOf(subscription: Stripe.Subscription): number {
  return subscription.items.data[0]?.quantity ?? 1;
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
            subscription_status: subscription.status,
            seat_limit: seatsOf(subscription),
            current_period_end: periodEnd(subscription),
            plan: "team",
          })
          .eq("id", orgId);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = orgIdOf(subscription);

        // Seat limit follows the paid quantity, so the app grants exactly what
        // is billed — including changes made in the Stripe portal.
        const patch = {
          subscription_status: subscription.status,
          seat_limit: seatsOf(subscription),
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
          seat_limit: FREE_SEAT_LIMIT,
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
