"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

/**
 * Opens the Stripe billing portal — card, invoices and cancellation.
 *
 * Starting a subscription lives in PlanCards instead, because it needs a tier.
 * A second, tier-less subscribe button here would quietly enrol everyone on
 * Starter regardless of which plan they had just picked.
 */
export function BillingActions({
  hasSubscription,
  canManage,
}: {
  hasSubscription: boolean;
  canManage: boolean;
}) {
  const [pending, setPending] = useState(false);
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

  if (!canManage) {
    return (
      <p className="text-sm text-ink-muted">
        Billing is managed by an organization admin.
      </p>
    );
  }

  // Nothing to manage until there is a subscription; the plan cards below are
  // the way in.
  if (!hasSubscription) return null;

  return (
    <div>
      <button
        type="button"
        onClick={openPortal}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
        Manage billing
      </button>

      {error && <p className="mt-3 text-sm text-status-risk">{error}</p>}
    </div>
  );
}
