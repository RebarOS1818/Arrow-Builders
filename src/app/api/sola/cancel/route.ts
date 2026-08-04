import { NextResponse } from "next/server";
import { sola } from "@/lib/sola/client";
import { isSolaConfigured } from "@/lib/sola/config";
import { billingCaller } from "@/lib/sola/org";
// The free allowance is a product rule rather than a Stripe one, and this is
// where it is currently defined. Imported rather than repeated so cancelling
// under either processor drops an organization to the same ceiling.
import { FREE_SEATS } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cancels the recurring schedule.
 *
 * Sola has no customer portal to send someone to, so cancelling has to live in
 * the app. The schedule is disabled rather than deleted, which leaves the
 * payment history intact at the gateway, and the customer and payment method
 * are kept so resubscribing does not mean re-entering a card.
 */
export async function POST() {
  if (!isSolaConfigured) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  const caller = await billingCaller();
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const scheduleId = caller.org.sola_schedule_id;
  if (!scheduleId) {
    return NextResponse.json({ error: "There is no subscription to cancel." }, { status: 409 });
  }

  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });

  const disabled = await sola("DisableSchedule", { ScheduleId: scheduleId });
  if (!disabled.ok) return NextResponse.json({ error: disabled.error }, { status: 502 });

  const { error } = await db
    .from("organizations")
    .update({
      sola_schedule_id: null,
      subscription_status: "canceled",
      plan: "starter",
      price_cents: 0,
      seat_limit: FREE_SEATS,
      current_period_end: null,
    })
    .eq("id", caller.org.id);

  if (error) {
    // The card will not be charged again either way — that is the part the
    // customer cares about, so it is said first.
    return NextResponse.json(
      {
        error: `Billing has stopped and your card will not be charged again, but the change could not be saved here. ${error.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
