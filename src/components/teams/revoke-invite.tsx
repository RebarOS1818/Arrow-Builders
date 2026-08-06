"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { revokeInvite } from "@/app/(app)/teams/actions";

/**
 * Takes back an invite that has not been accepted.
 *
 * The action has existed since seats were introduced; nothing ever called it.
 * So an invite sent to the wrong address, or twice to the right one, held a
 * seat permanently — and on a plan whose limit is the seat count, that is a bill
 * for a person who does not exist. The only way out was the SQL editor.
 *
 * It asks first. Revoking is not destructive in the sense that matters — a new
 * invite can always be sent — but it does invalidate a link somebody may be
 * about to click, and the row it removes is the only record that the link was
 * ever sent.
 */
export function RevokeInvite({ id, email }: { id: string; email: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function revoke() {
    if (!confirm(`Revoke the invite to ${email}? Their link stops working and the seat is freed.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await revokeInvite(id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <span className="flex shrink-0 items-center gap-2">
      {error && <span className="max-w-48 text-right text-xs text-status-risk">{error}</span>}
      <button
        type="button"
        onClick={revoke}
        disabled={pending}
        aria-label={`Revoke invite to ${email}`}
        className="pressable inline-flex min-h-9 items-center gap-1.5 rounded-full bg-canvas px-3 text-xs font-semibold text-ink-muted hover:bg-rose-50 hover:text-status-risk disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
        {pending ? "Revoking…" : "Revoke"}
      </button>
    </span>
  );
}
