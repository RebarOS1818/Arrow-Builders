import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { SOLA_WEBHOOK_PIN } from "@/lib/sola/config";
import { planByAmountCents } from "@/lib/sola/plans";
import { createAdminClient } from "@/lib/supabase/admin";

// MD5 comes from node:crypto, which the edge runtime does not provide.
export const runtime = "nodejs";

/**
 * Payment notifications from Sola.
 *
 * Configured in the Sola portal under Settings → Gateway Settings → Webhook,
 * pointed at `<app>/api/sola/webhook`, with the same PIN as SOLA_WEBHOOK_PIN.
 *
 * This is the only thing that keeps the recorded status honest after the first
 * payment: a card that expires or is declined next month produces no request to
 * the app at all, so without this handler an organization would read as `active`
 * forever while Sola quietly stopped collecting.
 */
export async function POST(request: NextRequest) {
  const db = createAdminClient();
  if (!SOLA_WEBHOOK_PIN || !db) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = request.headers.get("ck-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // Read the raw body: the signature is computed over the decoded values, so
  // the parsing has to be ours rather than the framework's.
  const raw = await request.text();
  const fields = parseFields(raw);

  if (!verify(fields, signature)) {
    return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  }

  const result = (field(fields, "xResponseResult") ?? "").toLowerCase();
  const scheduleId = field(fields, "xScheduleID") ?? field(fields, "xScheduleId");
  const customerId = field(fields, "xCustomerID") ?? field(fields, "xCustomerId");

  // Nothing identifies an organization. Acknowledged rather than failed: a 500
  // would have Sola retry a payload that will never become actionable, and the
  // gateway sends notifications for one-off transactions too, which this app
  // does not take.
  //
  // This is also the single most likely thing to be wrong. The published field
  // list covers a card transaction and never says what a *recurring* run sends,
  // so if those runs name the schedule differently, every one of them lands
  // here and does nothing — statuses would freeze on whatever they were and a
  // declined card would never show as past_due. Silent, and indistinguishable
  // from working. So it says so, with the field names it actually received.
  if (!scheduleId && !customerId) {
    console.warn(
      "[sola webhook] no schedule or customer id; nothing updated. fields:",
      fields.map(([key]) => key).join(","),
    );
    return NextResponse.json({ received: true, matched: false });
  }

  const match = scheduleId
    ? { column: "sola_schedule_id", value: scheduleId }
    : { column: "sola_customer_id", value: customerId! };

  try {
    let updated = 0;

    if (result === "approved") {
      const amount = centsOf(field(fields, "xAmount"));
      const plan = amount === null ? undefined : planByAmountCents(amount);

      // The ids come back so a payload that names a schedule we have never
      // heard of is distinguishable from one that updated a row. Both look
      // identical from the outside otherwise.
      const { data } = await db
        .from("organizations")
        .update({
          subscription_status: "active",
          current_period_end: nextMonth().toISOString(),
          // Only written when the amount charged matches a plan we sell. A
          // negotiated amount set in the Sola portal would otherwise be filed
          // under whichever plan happened to be closest, or wipe the plan
          // entirely — leaving the customer's seat limit wrong.
          ...(plan ? { plan: plan.key, seat_limit: plan.includedSeats } : {}),
          ...(amount === null ? {} : { price_cents: amount }),
        })
        .eq(match.column, match.value)
        .select("id");
      updated = data?.length ?? 0;
    } else if (result === "declined" || result === "error") {
      // A failed card is a dunning problem, not a reason to lock a crew out
      // mid-job. Access continues while Sola retries.
      const { data } = await db
        .from("organizations")
        .update({ subscription_status: "past_due" })
        .eq(match.column, match.value)
        .select("id");
      updated = data?.length ?? 0;
    }

    console.info(
      `[sola webhook] result=${result || "(none)"} by=${match.column} rows=${updated}`,
    );
    return NextResponse.json({ received: true, matched: updated > 0 });
  } catch (cause) {
    // A 500 asks Sola to send it again, which is what we want for a transient
    // database failure — the signature already proved the payload is genuine.
    const message = cause instanceof Error ? cause.message : "Handler failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * The body is form-encoded. Kept as pairs rather than an object because the
 * signature is computed over sorted *keys*, and an object would lose a repeated
 * key before we got the chance to notice it.
 */
function parseFields(raw: string): [string, string][] {
  return [...new URLSearchParams(raw).entries()];
}

/** Case-insensitive lookup: the gateway's casing is not guaranteed. */
function field(fields: [string, string][], name: string): string | null {
  const wanted = name.toLowerCase();
  const found = fields.find(([key]) => key.toLowerCase() === wanted);
  return found ? found[1] : null;
}

/**
 * Sola's scheme: lowercase the keys, sort by them, concatenate the values in
 * that order, append the PIN, and MD5 the result.
 *
 * MD5 is not our choice — it is what the gateway signs with. The PIN is the
 * secret that makes it a signature rather than a checksum, so it is compared in
 * constant time; a plain === leaks how much of a forged digest was right.
 */
function verify(fields: [string, string][], signature: string): boolean {
  const joined = fields
    .map(([key, value]) => [key.toLowerCase(), value] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([, value]) => value)
    .join("");

  const expected = createHash("md5").update(joined + SOLA_WEBHOOK_PIN).digest("hex");
  const given = signature.trim().toLowerCase();

  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/** "29.00" → 2900. Rounded, so floating point cannot shave a cent off. */
function centsOf(amount: string | null): number | null {
  if (!amount) return null;
  const parsed = Number.parseFloat(amount);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

function nextMonth() {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date;
}
