"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, MailCheck, MailX, UserPlus } from "lucide-react";
import { inviteMember } from "@/app/(app)/teams/actions";

/** Explains a failed send in the admin's terms, not the API's. */
const DELIVERY_NOTE: Record<string, string> = {
  not_configured: " — no SMTP provider is set up in Supabase yet.",
  already_registered: " — that address already has an account here.",
  failed: " — the mail provider rejected it.",
};

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
  const [link, setLink] = useState<{
    email: string;
    url: string;
    emailed: boolean;
    reason?: string;
  } | null>(null);

  const seatsFull = seatsAvailable <= 0;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLink(null);
    setNeedsSeats(false);

    startTransition(async () => {
      const result = await inviteMember(email, role);
      if (result.ok) {
        setLink({
          email,
          url: result.inviteUrl,
          emailed: result.emailed,
          reason: result.emailed ? undefined : result.reason,
        });
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

      {link && (
        <div className="mt-3 rounded-tile bg-brand-50 p-3">
          <p className="flex items-start gap-2 text-sm font-medium text-brand-900">
            {link.emailed ? (
              <MailCheck className="mt-0.5 size-4 shrink-0" />
            ) : (
              <MailX className="mt-0.5 size-4 shrink-0" />
            )}
            <span>
              {link.emailed
                ? `Invite emailed to ${link.email}.`
                : `Invite created for ${link.email}, but the email did not send${
                    DELIVERY_NOTE[link.reason ?? ""] ?? ""
                  } Send them this link instead.`}
            </span>
          </p>
          <p className="mt-1.5 text-xs text-brand-900/70">
            The link is the only thing that grants access — treat it like a password.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={link.url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Invite link"
              className="min-w-0 flex-1 rounded-lg bg-surface px-2.5 py-1.5 font-mono text-xs outline-none"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(link.url)}
              className="shrink-0 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-xs text-brand-900/70">
            It holds a seat until accepted or revoked.
          </p>
        </div>
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
