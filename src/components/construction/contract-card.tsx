import { StatusPill } from "@/components/phases/badges";
import { EditContractForm } from "@/components/phases/edit-forms";
import { OpenOnClick } from "@/components/phases/open-on-click";
import { TRADE_LABELS } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { ContractWithParties } from "@/lib/types";

/**
 * A contract, shaped like a project card.
 *
 * Projects reads as one thing because it is one grid of one kind of card. This
 * page used to be four stacked tables, and the money — the only reason anyone
 * opens it — was a column in the third one. Here it is the largest thing on the
 * card, in a band that plays the part the cover art plays on a project.
 *
 * The band is a figure rather than a picture. A generated motif would be
 * decoration on a record whose entire purpose is an amount, and there is a real
 * number available to fill the same space.
 */
export function ContractCard({ contract }: { contract: ContractWithParties }) {
  const original = Number(contract.original_amount);
  const approved = contract.totals?.approved_changes ?? 0;
  const pending = contract.totals?.pending_changes ?? 0;
  const current = contract.totals?.current_amount ?? original;

  // How much of the current value arrived as change orders rather than as the
  // signed contract. Growth is the thing that gets missed on a contract, and it
  // is invisible in a figure that has already absorbed it.
  const grown = approved > 0;
  const originalShare = current > 0 ? Math.min(100, (original / current) * 100) : 100;

  return (
    <OpenOnClick className="card group flex cursor-pointer flex-col p-3 transition-shadow hover:shadow-lift">
      <div className="relative flex h-36 w-full flex-col justify-between overflow-hidden rounded-tile bg-gradient-to-br from-brand-500 to-brand-800 p-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-200">
            {TRADE_LABELS[contract.trade]}
          </span>
          <span className="text-[11px] font-medium tabular-nums text-brand-200">
            {contract.contract_number}
          </span>
        </div>
        <div>
          <p className="text-[11px] text-brand-200">Current value</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {formatCurrency(current)}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-1 pt-3.5">
        {/* The pencil rides the status row. Given a block of its own it would
            reserve a strip of blank card, because it is invisible until the
            card is hovered. */}
        <div className="flex items-center justify-between gap-2">
          <StatusPill kind="contract" value={contract.status} />
          <EditContractForm contract={contract} />
        </div>

        <h3 className="mt-2.5 font-semibold leading-snug tracking-tight group-hover:text-brand-700">
          {contract.title}
        </h3>
        <p className="mt-0.5 text-xs text-ink-muted">
          {contract.subcontractor.company_name} · {contract.project.name}
        </p>

        <div className="mt-3.5">
          <div className="flex items-baseline justify-between gap-2 text-[11px] text-ink-muted">
            <span>
              {grown ? (
                <>
                  {formatCurrency(original)} signed
                  <span className="font-semibold text-status-behind-ink">
                    {" "}
                    +{formatCurrency(approved)}
                  </span>
                </>
              ) : (
                "No approved changes"
              )}
            </span>
            {contract.ends_on && <span>{formatDate(contract.ends_on)}</span>}
          </div>
          {/* Two-tone only when there is a second tone to show. A bar that is
              always one solid colour says nothing and still costs a row. */}
          <div
            className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-line"
            role="img"
            aria-label={
              grown
                ? `${formatCurrency(approved)} of change orders on ${formatCurrency(original)} signed`
                : "No approved change orders"
            }
          >
            <div className="h-full bg-brand-600" style={{ width: `${originalShare}%` }} />
            <div className="h-full flex-1 bg-status-behind" />
          </div>
        </div>

        {pending !== 0 && (
          <p
            className={cn(
              "mt-3 rounded-tile bg-orange-50 px-2.5 py-1.5 text-[11px] font-medium text-status-behind-ink",
            )}
          >
            {formatCurrency(pending)} pending, not yet committed
          </p>
        )}
      </div>
    </OpenOnClick>
  );
}
