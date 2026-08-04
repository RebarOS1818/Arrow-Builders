import { NextResponse } from "next/server";
import { sola, solaAmount } from "@/lib/sola/client";
import { isSolaConfigured } from "@/lib/sola/config";
import { billingCaller } from "@/lib/sola/org";
import { isSelfServe, planByKey } from "@/lib/sola/plans";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Moves an existing subscription to a different plan by changing the amount on
 * its schedule. The card already on file is reused, so nothing goes through the
 * browser.
 *
 * Sola does not prorate. Changing the amount changes what the *next* run
 * charges; the month already paid for is not adjusted either way. That is a
 * real behavioural difference from the Stripe path and the billing page says so
 * rather than leaving the customer to discover it on their statement.
 */
export async function POST(request: Request) {
  if (!isSolaConfigured) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { plan?: string };
  const plan = planByKey(body.plan ?? "");

  if (!plan) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  if (!isSelfServe(plan) || plan.listPriceCents === null) {
    return NextResponse.json(
      { error: `${plan.name} is arranged with our team rather than bought online.` },
      { status: 400 },
    );
  }

  const caller = await billingCaller();
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const scheduleId = caller.org.sola_schedule_id;
  if (!scheduleId) {
    return NextResponse.json({ error: "There is no subscription to change." }, { status: 409 });
  }

  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });

  // UpdateSchedule is optimistic-concurrency controlled: it requires the
  // revision it is editing, and refuses if the schedule moved on in between.
  // That means reading it first — the revision is not something we can cache.
  const current = await sola<{ Revision?: string | number }>("GetSchedule", {
    ScheduleId: scheduleId,
  });
  if (!current.ok) return NextResponse.json({ error: current.error }, { status: 502 });

  const revision = current.data.Revision;
  if (revision === undefined || revision === null) {
    return NextResponse.json(
      { error: "Sola did not report the schedule's revision, so it cannot be changed safely." },
      { status: 502 },
    );
  }

  const updated = await sola("UpdateSchedule", {
    ScheduleId: scheduleId,
    Revision: revision,
    Amount: solaAmount(plan.listPriceCents),
    ScheduleName: `${plan.name} — ${caller.org.name}`,
  });
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: 502 });

  const { error } = await db
    .from("organizations")
    .update({
      plan: plan.key,
      seat_limit: plan.includedSeats,
      price_cents: plan.listPriceCents,
    })
    .eq("id", caller.org.id);

  if (error) {
    // The gateway is now charging the new amount. Saying so is better than a
    // generic failure that would have them click again and change nothing.
    return NextResponse.json(
      {
        error: `Your plan was changed at Sola but could not be saved here. It will correct itself on the next payment. ${error.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
