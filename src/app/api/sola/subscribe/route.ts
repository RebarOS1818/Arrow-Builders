import { NextResponse } from "next/server";
import { sola, solaAmount, solaDate } from "@/lib/sola/client";
import { isSolaConfigured, missingSolaEnv } from "@/lib/sola/config";
import { billingCaller } from "@/lib/sola/org";
import { isSelfServe, planByKey } from "@/lib/sola/plans";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Starts a recurring Sola schedule for the caller's organization.
 *
 * Three gateway calls, in order, because each needs the identifier the last one
 * returned: a customer, a payment method built from the browser's single-use
 * token, and a monthly schedule that charges it. There is no hosted checkout to
 * hand off to, so this endpoint owns the whole sequence — including undoing it
 * when a later step fails.
 *
 * The card number never reaches this route. iFields exchanges it for a one-time
 * token in an iframe served by Cardknox, so the only card data here is that
 * token and an expiry.
 */
export async function POST(request: Request) {
  if (!isSolaConfigured) {
    return NextResponse.json(
      { error: `Billing is not configured. Missing: ${missingSolaEnv.join(", ")}.` },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    plan?: string;
    token?: string;
    exp?: string;
    cardholder?: string;
    postalCode?: string;
  };

  // Validated against the server's own list. A plan key from the body could
  // otherwise name a price this organization was never shown.
  const plan = planByKey(body.plan ?? "");
  if (!plan) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  if (!isSelfServe(plan) || plan.listPriceCents === null) {
    return NextResponse.json(
      { error: `${plan.name} is arranged with our team rather than bought online.` },
      { status: 400 },
    );
  }

  const token = body.token?.trim();
  const exp = body.exp?.trim().replace(/\D/g, "");
  const cardholder = body.cardholder?.trim();

  if (!token) return NextResponse.json({ error: "The card was not tokenized." }, { status: 400 });
  if (!exp || exp.length !== 4) {
    return NextResponse.json({ error: "Enter the expiry as MM/YY." }, { status: 400 });
  }
  if (!cardholder) {
    return NextResponse.json({ error: "Enter the name on the card." }, { status: 400 });
  }

  const caller = await billingCaller();
  if (!caller.ok) {
    return NextResponse.json({ error: caller.error }, { status: caller.status });
  }
  const { org } = caller;

  if (org.sola_schedule_id) {
    return NextResponse.json({ error: "Already subscribed." }, { status: 409 });
  }

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  // ---------------------------------------------------------------- customer
  let customerId = org.sola_customer_id;
  if (!customerId) {
    const created = await sola<{ CustomerId?: string }>("CreateCustomer", {
      // The organization id is carried as the customer number so a record in
      // the Sola portal can be traced back here without a database lookup.
      CustomerNumber: org.id,
      Company: org.name,
      Email: org.email ?? "",
    });
    if (!created.ok) return NextResponse.json({ error: created.error }, { status: 502 });

    customerId = created.data.CustomerId ?? null;
    if (!customerId) {
      return NextResponse.json({ error: "Sola did not return a customer." }, { status: 502 });
    }

    // Stored before the card is attached. If the next call fails, the customer
    // still exists at Sola, and re-running this route would otherwise create a
    // second one for the same organization on every retry.
    await db.from("organizations").update({ sola_customer_id: customerId }).eq("id", org.id);
  }

  // ---------------------------------------------------------- payment method
  const method = await sola<{ PaymentMethodId?: string }>("CreatePaymentMethod", {
    CustomerId: customerId,
    Token: token,
    TokenType: "cc",
    Exp: exp,
    Name: cardholder,
    ...(body.postalCode?.trim() ? { Zip: body.postalCode.trim() } : {}),
  });
  if (!method.ok) return NextResponse.json({ error: method.error }, { status: 402 });

  const paymentMethodId = method.data.PaymentMethodId;
  if (!paymentMethodId) {
    return NextResponse.json({ error: "Sola did not return a payment method." }, { status: 502 });
  }

  // ---------------------------------------------------------------- schedule
  //
  // StartDate is set explicitly to today rather than left out. Omitted, Sola
  // takes the first payment immediately *and* runs the schedule on its own
  // reckoning, which is how a customer ends up charged twice in their first
  // month. Naming the date makes the first run unambiguous.
  const schedule = await sola<{ ScheduleId?: string }>("CreateSchedule", {
    CustomerId: customerId,
    PaymentMethodId: paymentMethodId,
    Amount: solaAmount(plan.listPriceCents),
    IntervalType: "month",
    IntervalCount: 1,
    StartDate: solaDate(new Date()),
    // Runs until cancelled. A finite count would silently stop billing an
    // active customer, who would keep their access for free.
    TotalPayments: 0,
    ScheduleName: `${plan.name} — ${org.name}`,
  });
  if (!schedule.ok) return NextResponse.json({ error: schedule.error }, { status: 402 });

  const scheduleId = schedule.data.ScheduleId;
  if (!scheduleId) {
    return NextResponse.json({ error: "Sola did not return a schedule." }, { status: 502 });
  }

  // ------------------------------------------------------------- record it
  const { error } = await db
    .from("organizations")
    .update({
      sola_customer_id: customerId,
      sola_payment_method_id: paymentMethodId,
      sola_schedule_id: scheduleId,
      plan: plan.key,
      seat_limit: plan.includedSeats,
      price_cents: plan.listPriceCents,
      // Access starts now. The schedule exists and will be charged; a failed
      // card arrives later as a webhook and moves this to past_due, which is the
      // same grace the Stripe path gives.
      subscription_status: "active",
      current_period_end: nextMonth().toISOString(),
    })
    .eq("id", org.id);

  if (error) {
    // A schedule the app has no record of would bill this customer every month
    // with nothing on our side to show for it, and no way for them to cancel it
    // from the billing page. Undo it rather than leave that behind.
    const undone = await sola("DisableSchedule", { ScheduleId: scheduleId });
    return NextResponse.json(
      {
        error: undone.ok
          ? `Your card was accepted but the subscription could not be saved, so it has been cancelled and you have not been billed. ${error.message}`
          : `Your card was accepted but the subscription could not be saved, and cancelling it also failed. Contact us before trying again — quote schedule ${scheduleId}.`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

/** Same day next month, clamped by Date's own month arithmetic. */
function nextMonth() {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date;
}
