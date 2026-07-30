import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { BillingActions } from "@/components/billing/billing-actions";
import { SeatMeter } from "@/components/billing/seat-meter";
import { formatCents, getBillingSummary, type SubscriptionStatus } from "@/lib/billing";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<SubscriptionStatus, { label: string; tone: string }> = {
  none: { label: "No subscription", tone: "bg-canvas text-ink-muted" },
  trialing: { label: "Trialing", tone: "bg-brand-50 text-brand-700" },
  active: { label: "Active", tone: "bg-emerald-50 text-status-ontrack" },
  past_due: { label: "Past due", tone: "bg-orange-50 text-status-behind" },
  canceled: { label: "Canceled", tone: "bg-canvas text-ink-muted" },
  incomplete: { label: "Incomplete", tone: "bg-orange-50 text-status-behind" },
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const [{ checkout }, billing] = await Promise.all([searchParams, getBillingSummary()]);
  const status = STATUS_COPY[billing.status];
  const seatsFull = billing.seatsAvailable <= 0;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {billing.orgName} is billed monthly for each seat in use.
        </p>
      </div>

      {checkout === "success" && (
        <Banner tone="ok" icon={CheckCircle2}>
          Subscription started. Seats update automatically as you add or remove people.
        </Banner>
      )}
      {checkout === "cancelled" && (
        <Banner tone="info" icon={Info}>
          Checkout was cancelled — nothing has been charged.
        </Banner>
      )}
      {billing.status === "past_due" && (
        <Banner tone="warn" icon={AlertTriangle}>
          The last payment failed. Update your card to keep the account active.
        </Banner>
      )}

      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold capitalize tracking-tight">
                {billing.plan} plan
              </h2>
              <span
                className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", status.tone)}
              >
                {status.label}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-ink-muted">
              {formatCents(billing.pricePerSeatCents)} per seat / month
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-ink-muted">Current monthly total</p>
            <p className="text-2xl font-semibold tracking-tight">
              {formatCents(billing.monthlyTotalCents)}
            </p>
            {billing.currentPeriodEnd && (
              <p className="mt-0.5 text-xs text-ink-subtle">
                Renews {formatDate(billing.currentPeriodEnd)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <SeatMeter
            used={billing.seatsUsed}
            limit={billing.seatLimit}
            members={billing.members}
            pendingInvites={billing.pendingInvites}
          />
        </div>

        {seatsFull && (
          <p className="mt-4 rounded-tile bg-orange-50 p-3 text-sm text-status-behind">
            Every seat is in use. New invites are blocked until you add seats
            {billing.canManage ? " in the billing portal." : "."}
          </p>
        )}

        <div className="mt-6 border-t border-line pt-5">
          <BillingActions
            hasSubscription={billing.hasSubscription}
            canManage={billing.canManage}
          />
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold tracking-tight">How seats are counted</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
          <li>
            A seat is used by every member of the organization and by every invite that
            has not yet been accepted.
          </li>
          <li>
            Adding a seat mid-cycle is prorated by Stripe — you pay the remainder of the
            month; removing one credits it back.
          </li>
          <li>
            Inviting past the plan limit is refused by the database, so the number of
            people with access can never exceed the number of seats billed.
          </li>
        </ul>
        <Link
          href="/teams"
          className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline"
        >
          Manage team members
        </Link>
      </section>

      {!billing.stripeReady && (
        <Banner tone="info" icon={Info}>
          Stripe is not configured, so these figures are illustrative. Set{" "}
          <code className="font-mono text-xs">STRIPE_SECRET_KEY</code>,{" "}
          <code className="font-mono text-xs">STRIPE_SEAT_PRICE_ID</code>,{" "}
          <code className="font-mono text-xs">STRIPE_WEBHOOK_SECRET</code> and{" "}
          <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> to take
          payments.
        </Banner>
      )}
    </div>
  );
}

function Banner({
  children,
  tone,
  icon: Icon,
}: {
  children: React.ReactNode;
  tone: "ok" | "warn" | "info";
  icon: React.ElementType;
}) {
  const tones = {
    ok: "bg-emerald-50 text-emerald-900",
    warn: "bg-orange-50 text-orange-900",
    info: "bg-brand-50 text-brand-900",
  };
  return (
    <div className={cn("flex items-start gap-2.5 rounded-card p-4 text-sm", tones[tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
