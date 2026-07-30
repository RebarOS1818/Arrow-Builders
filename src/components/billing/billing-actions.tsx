"use client";

import { useState } from "react";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";

/** Kicks off Stripe Checkout or the billing portal and follows the returned URL. */
export function BillingActions({
  hasSubscription,
  canManage,
}: {
  hasSubscription: boolean;
  canManage: boolean;
}) {
  const [pending, setPending] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(kind: "checkout" | "portal") {
    setPending(kind);
    setError(null);
    try {
      const response = await fetch(`/api/stripe/${kind}`, { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error ?? "Something went wrong.");
      window.location.href = body.url;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      setPending(null);
    }
  }

  if (!canManage) {
    return (
      <p className="text-sm text-ink-muted">
        Billing is managed by an organization admin.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {hasSubscription ? (
          <button
            type="button"
            onClick={() => go("portal")}
            disabled={pending !== null}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {pending === "portal" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ExternalLink className="size-4" />
            )}
            Manage billing
          </button>
        ) : (
          <button
            type="button"
            onClick={() => go("checkout")}
            disabled={pending !== null}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {pending === "checkout" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CreditCard className="size-4" />
            )}
            Start subscription
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-status-risk">{error}</p>}
    </div>
  );
}
