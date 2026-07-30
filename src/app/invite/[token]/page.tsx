import Link from "next/link";
import { HardHat } from "lucide-react";
import { AcceptInvite } from "@/components/teams/accept-invite";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = await createClient();

  let orgName: string | null = null;
  let role: string | null = null;
  let valid = false;
  let signedIn = false;

  if (db) {
    const [{ data: preview }, { data: auth }] = await Promise.all([
      db.rpc("invite_preview", { invite_token: token }),
      db.auth.getUser(),
    ]);

    const row = preview as { valid: boolean; org?: string; role?: string } | null;
    valid = Boolean(row?.valid);
    orgName = row?.org ?? null;
    role = row?.role ?? null;
    signedIn = Boolean(auth.user);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
            <HardHat className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Arrow Builders</span>
        </div>

        <div className="card p-6">
          {!db ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight">Invites need Supabase</h1>
              <p className="mt-2 text-sm text-ink-muted">
                This deployment is running on demo data, so there is nothing to join yet.
              </p>
            </>
          ) : !valid ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight">Invite not valid</h1>
              <p className="mt-2 text-sm text-ink-muted">
                This link has already been used, was revoked, or never existed. Ask whoever
                invited you for a fresh link.
              </p>
              <Link
                href="/login"
                className="mt-5 block rounded-full bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700"
              >
                Go to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                You have been invited to {orgName}
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                You will join as <span className="font-medium text-ink">{role}</span>.
              </p>

              {signedIn ? (
                <AcceptInvite token={token} orgName={orgName ?? "the organization"} />
              ) : (
                <>
                  <p className="mt-4 rounded-tile bg-canvas p-3 text-sm text-ink-muted">
                    Sign in or create an account first, then reopen this link to join.
                  </p>
                  <Link
                    href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                    className="mt-4 block rounded-full bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Continue
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
