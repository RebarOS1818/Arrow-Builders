"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";
import { inviteMember } from "@/app/(app)/teams/actions";

const ROLES = [
  "Crew",
  "Foreman",
  "Superintendent",
  "Project Engineer",
  "Estimator",
  "Safety Lead",
];

export function InviteForm({
  seatsAvailable,
  canInvite,
}: {
  seatsAvailable: number;
  canInvite: boolean;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLES[0]!);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [needsSeats, setNeedsSeats] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const seatsFull = seatsAvailable <= 0;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSent(null);
    setNeedsSeats(false);

    startTransition(async () => {
      const result = await inviteMember(email, role);
      if (result.ok) {
        setSent(email);
        setEmail("");
      } else {
        setError(result.error);
        setNeedsSeats(Boolean(result.needsSeats));
      }
    });
  }

  if (!canInvite) return null;

  return (
    <form onSubmit={onSubmit} className="card p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-52 flex-1">
          <span className="text-sm font-medium">Invite by email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="mt-1.5 w-full rounded-tile bg-canvas px-3.5 py-2.5 text-sm outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <label>
          <span className="text-sm font-medium">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1.5 w-full rounded-tile bg-canvas px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
          >
            {ROLES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={pending || seatsFull}
          title={seatsFull ? "No seats available on your plan" : undefined}
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Send invite
        </button>
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        {seatsFull ? (
          <span className="text-status-behind">
            All seats on your plan are in use.{" "}
            <Link href="/billing" className="font-semibold underline">
              Add seats
            </Link>{" "}
            to invite more people.
          </span>
        ) : (
          `${seatsAvailable} seat${seatsAvailable === 1 ? "" : "s"} available on your plan.`
        )}
      </p>

      {sent && (
        <p className="mt-2 text-sm text-status-ontrack">
          Invite sent to {sent}. It holds a seat until accepted or revoked.
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm text-status-risk">
          {error}
          {needsSeats && (
            <>
              {" "}
              <Link href="/billing" className="font-semibold underline">
                Go to billing
              </Link>
            </>
          )}
        </p>
      )}
    </form>
  );
}
