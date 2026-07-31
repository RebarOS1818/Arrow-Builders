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
  incomplete_expired: { label: "Expired", tone: "bg-canvas text-ink-muted" },
  unpaid: { label: "Unpaid", tone: "bg-rose-50 text-status-risk" },
  paused: { label: "Paused", tone: "bg-canvas text-ink-muted" },
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
          {billing.loadError
            ? "Plan details are unavailable until the database is up to date."
            : `${billing.orgName} is on a flat monthly plan for up to ${billing.seatLimit} users.`}
        </p>
      </div>

      {billing.loadError && (
        <Banner tone="warn" icon={AlertTriangle}>
          {billing.loadError}
        </Banner>
      )}

      {checkout === "success" && (
        <Banner tone="ok" icon={CheckCircle2}>
          Subscription started. Invite up to {billing.seatLimit} users at no extra charge.
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

      {!billing.loadError && (
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
              {billing.priceCents > 0
                ? `${formatCents(billing.priceCents)} / month`
                : "Price set at checkout"}{" "}
              · up to {billing.seatLimit} users
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-ink-muted">Monthly total</p>
            <p className="text-2xl font-semibold tracking-tight">
              {billing.monthlyTotalCents > 0 ? formatCents(billing.monthlyTotalCents) : "—"}
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
            All {billing.seatLimit} users on this plan are in use. New invites are
            blocked until someone is removed, or the plan is changed.
          </p>
        )}

        <div className="mt-6 border-t border-line pt-5">
          <BillingActions
            hasSubscription={billing.hasSubscription}
            canManage={billing.canManage}
          />
        </div>
      </section>
      )}

      <section className="card p-6">
        <h2 className="font-semibold tracking-tight">How users are counted</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
          <li>
            A place is taken by every member of the organization and by every invite
            that has not yet been accepted.
          </li>
          <li>
            The fee is flat. Adding or removing people does not change the monthly
            amount, so there is nothing to prorate.
          </li>
          <li>
            Inviting past the plan{"’"}s limit
            {billing.loadError ? "" : ` of ${billing.seatLimit}`} is refused by the
            database, so the number of people with access can never exceed the plan.
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
          Billing is inactive, so these figures are illustrative. Checkout stays
          disabled until every variable is set — otherwise a customer could be charged
          without the subscription being recorded. Still missing:{" "}
          {billing.missingEnv.map((name, index) => (
            <span key={name}>
              {index > 0 && ", "}
              <code className="font-mono text-xs">{name}</code>
            </span>
          ))}
          .
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
