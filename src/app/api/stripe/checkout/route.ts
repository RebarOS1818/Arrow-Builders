import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { APP_URL, STRIPE_PRICE_ID } from "@/lib/stripe/config";

/** Starts the flat-fee subscription for the caller's organization. Admins only. */
export async function POST() {
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
  const isAdmin = Boolean((profile as { is_admin: boolean } | null)?.is_admin);

  if (!orgId) return NextResponse.json({ error: "No organization." }, { status: 400 });
  if (!isAdmin) {
    return NextResponse.json({ error: "Only admins can manage billing." }, { status: 403 });
  }

  const { data: org } = await db
    .from("organizations")
    .select("id, name, stripe_customer_id, stripe_subscription_id")
    .eq("id", orgId)
    .single();

  const row = org as {
    id: string;
    name: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
  } | null;

  if (row?.stripe_subscription_id) {
    return NextResponse.json({ error: "Already subscribed." }, { status: 409 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // Flat fee: one unit of a fixed-price recurring item, whatever the head
      // count. The user allowance rides on the Price's included_seats metadata.
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      customer: row?.stripe_customer_id ?? undefined,
      customer_email: row?.stripe_customer_id ? undefined : (user.email ?? undefined),
      client_reference_id: orgId,
      // The webhook trusts this to attribute the subscription to an organization.
      subscription_data: { metadata: { org_id: orgId } },
      metadata: { org_id: orgId },
      allow_promotion_codes: true,
      success_url: `${APP_URL}/billing?checkout=success`,
      cancel_url: `${APP_URL}/billing?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Checkout failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
