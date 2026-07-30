import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { APP_URL } from "@/lib/stripe/config";

/** Opens the Stripe billing portal so admins can change card, invoices or cancel. */
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
  if (!orgId) return NextResponse.json({ error: "No organization." }, { status: 400 });
  if (!(profile as { is_admin: boolean } | null)?.is_admin) {
    return NextResponse.json({ error: "Only admins can manage billing." }, { status: 403 });
  }

  const { data: org } = await db
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .single();

  const customerId = (org as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: "No billing account yet." }, { status: 409 });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Portal failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
