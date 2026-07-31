"use client";

import { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

type TierCard = {
  key: string;
  name: string;
  tagline: string;
  includedSeats: number;
  listPriceCents: number | null;
  highlights: string[];
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/**
 * The three plans, with the organization's current one marked.
 *
 * Subscribing and changing plan hit different endpoints because they are
 * different Stripe operations — a second Checkout for an existing subscriber
 * would leave them paying twice.
 */
export function PlanCards({
  tiers,
  selfServe,
  salesEmail,
  currentPlan,
  hasSubscription,
  canManage,
}: {
  tiers: TierCard[];
  selfServe: Record<string, boolean>;
  salesEmail: string;
  currentPlan: string;
  hasSubscription: boolean;
  canManage: boolean;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(tierKey: string) {
    setPending(tierKey);
    setError(null);
    try {
      const endpoint = hasSubscription ? "change-plan" : "checkout";
      const response = await fetch(`/api/stripe/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierKey }),
      });
      const body = (await response.json()) as { url?: string; ok?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Something went wrong.");

      // Checkout hands back a Stripe URL; a plan change completes server-side
      // and only needs the page to re-read the (webhook-updated) organization.
      if (body.url) window.location.assign(body.url);
      else window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      setPending(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {tiers.map((tier) => {
          // Only a paid subscription makes a tier "current". An organization
          // with no subscription sits on plan='starter' by default, and marking
          // that as current would replace Starter's buy button with "Your
          // current plan" — leaving no way to actually subscribe to it.
          const isCurrent = hasSubscription && tier.key === currentPlan;
          const buyable = selfServe[tier.key];

          return (
            <article
              key={tier.key}
              className={cn(
                "card flex flex-col p-5",
                isCurrent && "ring-2 ring-brand-500",
              )}
            >
              <div className="flex items-center gap-2">
                <h3 className="font-semibold tracking-tight">{tier.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    Current
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-ink-muted">{tier.tagline}</p>

              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {tier.listPriceCents === null ? (
                  <span className="text-lg">Let&apos;s talk</span>
                ) : (
                  <>
                    {money(tier.listPriceCents)}
                    <span className="text-sm font-normal text-ink-muted"> / month</span>
                  </>
                )}
              </p>

              <ul className="mt-4 flex-1 space-y-2">
                {tier.highlights.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm text-ink-muted">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-600" />
                    {line}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent ? (
                  <p className="text-sm font-medium text-ink-muted">Your current plan</p>
                ) : buyable ? (
                  <button
                    type="button"
                    disabled={!canManage || pending !== null}
                    onClick={() => choose(tier.key)}
                    title={canManage ? undefined : "Only admins can manage billing"}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pending === tier.key && <Loader2 className="size-4 animate-spin" />}
                    {hasSubscription ? `Switch to ${tier.name}` : `Choose ${tier.name}`}
                  </button>
                ) : salesEmail ? (
                  <a
                    href={`mailto:${salesEmail}?subject=${encodeURIComponent(`${tier.name} plan enquiry`)}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-canvas px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-line"
                  >
                    <Mail className="size-4" />
                    Contact us
                  </a>
                ) : (
                  <p className="text-sm text-ink-subtle">Contact your account manager.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-status-risk">{error}</p>}

      {hasSubscription && (
        <p className="mt-3 text-xs text-ink-muted">
          Changing plan takes effect immediately. Stripe prorates the difference — an upgrade
          charges the remainder of this month, a downgrade credits it.
        </p>
      )}
    </div>
  );
}
