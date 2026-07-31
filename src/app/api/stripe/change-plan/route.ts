import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { isSelfServe, tierByKey } from "@/lib/stripe/tiers";

/**
 * Moves an existing subscription to a different tier.
 *
 * Separate from checkout because the Stripe call is different: an organization
 * that already pays should have its subscription item swapped to the new Price,
 * not be sent through Checkout again — that would leave them with two
 * subscriptions and two invoices.
 *
 * The database is not written here. Stripe emits customer.subscription.updated,
 * and the webhook records the new plan, allowance and amount from the Price it
 * actually sees. One writer keeps the app and the invoice from disagreeing.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { tier?: string };
  const tier = tierByKey(body.tier ?? "");

  if (!tier) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  if (!isSelfServe(tier)) {
    return NextResponse.json(
      { error: `${tier.name} is arranged with our team rather than bought online.` },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const db = await createClient();
  if (!stripe || !db) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: profile } = await db
    .from("profiles")
    .select("org_id, is_admin")
    .eq("id", user.id)
    .single();

  const orgId = (profile as { org_id: string | null } | null)?.org_id;
  if (!orgId) return NextResponse.json({ error: "No organization." }, { status: 400 });
  if (!(profile as { is_admin: boolean } | null)?.is_admin) {
    return NextResponse.json({ error: "Only admins can manage billing." }, { status: 403 });
  }

  const { data: org } = await db
    .from("organizations")
    .select("stripe_subscription_id")
    .eq("id", orgId)
    .single();

  const subscriptionId = (org as { stripe_subscription_id: string | null } | null)
    ?.stripe_subscription_id;
  if (!subscriptionId) {
    return NextResponse.json({ error: "No active subscription to change." }, { status: 409 });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const item = subscription.items.data[0];
    if (!item) {
      return NextResponse.json({ error: "Subscription has no billable item." }, { status: 502 });
    }

    if (item.price.id === tier.priceId) {
      return NextResponse.json({ error: `Already on ${tier.name}.` }, { status: 409 });
    }

    await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: item.id, price: tier.priceId, quantity: 1 }],
      // Downgrading mid-cycle credits the unused remainder; upgrading charges
      // the difference. Leaving this to Stripe keeps the arithmetic out of here.
      proration_behavior: "create_prorations",
    });

    return NextResponse.json({ ok: true });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not change plan.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
