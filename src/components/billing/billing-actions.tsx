"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

/**
 * Managing an existing subscription.
 *
 * Stripe has a hosted portal for card, invoices and cancellation, so this is a
 * link out. Sola has none — there is nowhere to send anyone — so cancelling has
 * to happen here, behind a confirmation, because a stray click would end
 * someone's billing with no undo.
 *
 * Starting a subscription lives in PlanCards instead, because it needs a plan.
 * A second, plan-less subscribe button here would quietly enrol everyone on
 * Starter regardless of which one they had just picked.
 */
export function BillingActions({
  hasSubscription,
  canManage,
  processor,
}: {
  hasSubscription: boolean;
  canManage: boolean;
  processor: "sola" | "stripe" | "none";
}) {
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error ?? "Something went wrong.");
      window.location.assign(body.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      setPending(false);
    }
  }

  async function cancel() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/sola/cancel", { method: "POST" });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      setPending(false);
    }
  }

  if (!canManage) {
    return <p className="text-sm text-ink-muted">Billing is managed by an organization admin.</p>;
  }

  // Nothing to manage until there is a subscription; the plan cards below are
  // the way in.
  if (!hasSubscription) return null;

  if (processor === "sola") {
    return (
      <div>
        {confirming ? (
          <div className="rounded-tile bg-orange-50 p-4">
            <p className="text-sm text-orange-900">
              Cancelling stops the monthly payment straight away and drops the
              organization to the free allowance. Your card stays on file, so
              resubscribing later does not mean entering it again.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={cancel}
                disabled={pending}
                className="pressable inline-flex items-center gap-2 rounded-full bg-status-risk px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                Cancel the subscription
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="pressable rounded-full px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-canvas"
              >
                Keep it
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="pressable rounded-full bg-canvas px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-line"
          >
            Cancel subscription
          </button>
        )}

        {error && <p className="mt-3 text-sm text-status-risk">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={openPortal}
        disabled={pending}
        className="pressable inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
        Manage billing
      </button>

      {error && <p className="mt-3 text-sm text-status-risk">{error}</p>}
    </div>
  );
}
