import { HardHat, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { TRADE_LABELS, TradeDot } from "@/components/ui/badge";
import { getTeam } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const team = await getTeam();
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
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          <UserPlus className="size-4" />
          Invite Member
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
    </div>
  );
}
