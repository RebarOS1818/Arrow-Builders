import Link from "next/link";
import { HardHat, MailCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { TRADE_LABELS, TradeDot } from "@/components/ui/badge";
import { InviteForm } from "@/components/teams/invite-form";
import { SeatMeter } from "@/components/billing/seat-meter";
import { getPendingInvites, getTeam } from "@/lib/data";
import { getBillingSummary } from "@/lib/billing";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const [team, billing, invites] = await Promise.all([
    getTeam(),
    getBillingSummary(),
    getPendingInvites(),
  ]);

  const onSite = team.filter((member) => member.on_site_today);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {team.length} people · {onSite.length} on site today
          </p>
        </div>
        <Link
          href="/billing"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Seats &amp; billing
        </Link>
      </div>

      <div className="card max-w-md p-5">
        <SeatMeter
          used={billing.seatsUsed}
          limit={billing.seatLimit}
          members={billing.members}
          pendingInvites={billing.pendingInvites}
        />
      </div>

      <InviteForm seatsAvailable={billing.seatsAvailable} canInvite={billing.canManage} />

      {invites.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold tracking-tight">Pending invites</h2>
          <ul className="card mt-3 divide-y divide-line">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                  <MailCheck className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{invite.email}</p>
                  <p className="text-xs text-ink-subtle">
                    {invite.role} · invited {formatDate(invite.created_at)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-ink-muted">
                  Holding a seat
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Members</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {team.map((member) => (
            <article key={member.id} className="card flex items-start gap-3 p-4">
              <Avatar name={member.full_name} initials={member.initials} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold leading-tight">{member.full_name}</p>
                <p className="mt-0.5 text-sm text-ink-muted">{member.role}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {member.trade && (
                    <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <TradeDot trade={member.trade} />
                      {TRADE_LABELS[member.trade]}
                    </span>
                  )}
                  {member.on_site_today && (
                    <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      <HardHat className="size-3" />
                      On site
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
