"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { acceptInvite } from "@/app/(app)/teams/actions";

export function AcceptInvite({ token, orgName }: { token: string; orgName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  function onAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInvite(token);
      if (result.ok) {
        setJoined(true);
        router.push("/");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (joined) {
    return (
      <p className="mt-5 flex items-center gap-2 text-sm font-medium text-status-ontrack">
        <CheckCircle2 className="size-4" />
        Joined {orgName}. Taking you in…
      </p>
    );
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={onAccept}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Join {orgName}
      </button>
      {error && <p className="mt-3 text-sm text-status-risk">{error}</p>}
    </div>
  );
}
