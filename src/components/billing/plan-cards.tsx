"use client";

import { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";
import { SolaCardForm } from "@/components/billing/sola-card-form";
import { cn } from "@/lib/utils";

type TierCard = {
  key: string;
  name: string;
  tagline: string;
  includedSeats: number;
  listPriceCents: number | null;
  highlights: string[];
  /** Why the tier cannot be bought, when Stripe could not price it. */
  unavailable?: string;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export type SolaConfig = {
  ifieldsKey: string;
  ifieldsVersion: string;
  softwareName: string;
  softwareVersion: string;
};

/**
 * The three plans, with the organization's current one marked.
 *
 * Subscribing and changing plan are separate operations under either processor —
 * a second checkout for an existing subscriber would leave them paying twice —
 * but they differ in where they happen. Stripe sends the customer away to a
 * hosted page; Sola has none, so the card form opens here instead.
 */
export function PlanCards({
  tiers,
  selfServe,
  salesEmail,
  currentPlan,
  hasSubscription,
  canManage,
  processor,
  sola,
}: {
  tiers: TierCard[];
  selfServe: Record<string, boolean>;
  salesEmail: string;
  currentPlan: string;
  hasSubscription: boolean;
  canManage: boolean;
  processor: "sola" | "stripe" | "none";
  sola: SolaConfig | null;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The plan whose card form is open, under Sola. */
  const [subscribing, setSubscribing] = useState<TierCard | null>(null);

  async function choose(tier: TierCard) {
    // Sola takes the card here rather than on a hosted page, so a first
    // subscription opens the form instead of calling anything.
    if (processor === "sola" && !hasSubscription && sola) {
      setError(null);
      setSubscribing(tier);
      return;
    }

    setPending(tier.key);
    setError(null);
    try {
      const endpoint =
        processor === "sola"
          ? "/api/sola/change-plan"
          : `/api/stripe/${hasSubscription ? "change-plan" : "checkout"}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Stripe's routes read `tier`, Sola's read `plan`. Both are sent rather
        // than branching, so neither route can be reached with the field it
        // does not look for.
        body: JSON.stringify({ tier: tier.key, plan: tier.key }),
      });
      const body = (await response.json()) as { url?: string; ok?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Something went wrong.");

      // Stripe checkout hands back a URL; everything else completes server-side
      // and only needs the page to re-read the organization.
      if (body.url) window.location.assign(body.url);
      else window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      setPending(null);
    }
  }

  if (subscribing && sola && subscribing.listPriceCents !== null) {
    return (
      <SolaCardForm
        plan={subscribing.key}
        planName={subscribing.name}
        priceLabel={money(subscribing.listPriceCents)}
        ifieldsKey={sola.ifieldsKey}
        ifieldsVersion={sola.ifieldsVersion}
        softwareName={sola.softwareName}
        softwareVersion={sola.softwareVersion}
        onCancel={() => setSubscribing(null)}
      />
    );
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
          // A tier Stripe could not price must not offer a button: the click
          // would fail at checkout, after raising the customer's expectations.
          const buyable = selfServe[tier.key] && !tier.unavailable;

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
                {/* Rendered from the allowance itself, so the headline user
                    count can never drift from what the plan actually grants. */}
                <li className="flex items-start gap-2 text-sm text-ink-muted">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  {tier.listPriceCents === null
                    ? "Users by agreement"
                    : `Up to ${tier.includedSeats} users`}
                </li>
                {tier.highlights.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm text-ink-muted">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-600" />
                    {line}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {tier.unavailable ? (
                  <p className="text-sm text-status-risk">
                    Unavailable — {tier.unavailable}
                  </p>
                ) : isCurrent ? (
                  <p className="text-sm font-medium text-ink-muted">Your current plan</p>
                ) : buyable ? (
                  <button
                    type="button"
                    disabled={!canManage || pending !== null}
                    onClick={() => choose(tier)}
                    title={canManage ? undefined : "Only admins can manage billing"}
                    className="pressable inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pending === tier.key && <Loader2 className="size-4 animate-spin" />}
                    {hasSubscription ? `Switch to ${tier.name}` : `Choose ${tier.name}`}
                  </button>
                ) : salesEmail ? (
                  <a
                    href={`mailto:${salesEmail}?subject=${encodeURIComponent(`${tier.name} plan enquiry`)}`}
                    className="pressable inline-flex w-full items-center justify-center gap-2 rounded-full bg-canvas px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-line"
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
          {processor === "sola"
            ? "Changing plan changes what the next monthly payment collects. The month already paid for is not prorated either way, so an upgrade takes full effect from the next payment date."
            : "Changing plan takes effect immediately. Stripe prorates the difference — an upgrade charges the remainder of this month, a downgrade credits it."}
        </p>
      )}
    </div>
  );
}
