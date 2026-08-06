"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { decideApproval } from "@/app/(app)/approvals/actions";

/**
 * Approve and reject, with the outcome visible.
 *
 * Both buttons disable together while a decision is in flight — approving and
 * rejecting the same item in the same breath is a race the database would
 * resolve arbitrarily.
 *
 * They grow to a full 44px on a phone. These two sit side by side, they commit
 * money, and one of them is not undoable from this screen — 26px of target for
 * a thumb is how you approve the invoice you meant to reject. The desktop size
 * is unchanged, where a cursor makes 26px precise enough.
 */
export function ApprovalActions({ id, reference }: { id: string; reference: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function decide(decision: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      const result = await decideApproval(id, decision);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => decide("rejected")}
          disabled={pending}
          aria-label={`Reject ${reference}`}
          className="pressable min-h-11 rounded-full border border-line px-4 text-xs font-medium text-ink-muted hover:text-ink disabled:opacity-50 sm:min-h-0 sm:px-3 sm:py-1"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => decide("approved")}
          disabled={pending}
          aria-label={`Approve ${reference}`}
          className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 sm:min-h-0 sm:px-3 sm:py-1"
        >
          {pending && <Loader2 className="size-3 animate-spin" />}
          Approve
        </button>
      </div>
      {error && <p className="max-w-56 text-right text-xs text-status-risk">{error}</p>}
    </div>
  );
}
