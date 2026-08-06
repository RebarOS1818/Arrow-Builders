import { AlertTriangle, FileSignature, Layers, Star, Users } from "lucide-react";
import { ConstructionSetup } from "@/components/construction/setup";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill, StatusPill, humanise } from "@/components/phases/badges";
import { ClickableRow } from "@/components/phases/clickable-row";
import { OpenOnClick } from "@/components/phases/open-on-click";
import {
  EditBidPackageForm,
  EditChangeOrderForm,
  EditContractForm,
  EditQuoteForm,
  EditSubcontractorForm,
} from "@/components/phases/edit-forms";
import {
  NewBidPackageForm,
  NewChangeOrderForm,
  NewContractForm,
  NewQuoteForm,
  NewSubcontractorForm,
} from "@/components/phases/forms";
import {
  getBidPackages,
  getChangeOrders,
  getContracts,
  getProjects,
  getSubcontractors,
} from "@/lib/data";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Days before an insurance certificate lapses that we start warning. */
const INSURANCE_WARNING_DAYS = 60;

export default async function ConstructionPage() {
  const [subs, packages, contracts, changeOrders, projects] = await Promise.all([
    getSubcontractors(),
    getBidPackages(),
    getContracts(),
    getChangeOrders(),
    getProjects(),
  ]);

  // Select options for the forms. Built here because the page already has the
  // rows; fetching them again inside each form would be three more round trips.
  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const subOptions = subs.map((s) => ({ value: s.id, label: s.company_name }));
  const packageOptions = packages.map((p) => ({
    value: p.id,
    label: `${p.project.name} — ${p.name}`,
  }));
  const contractOptions = contracts.map((c) => ({
    value: c.id,
    label: `${c.contract_number} — ${c.title}`,
  }));

  const committed = contracts.reduce(
    (sum, c) => sum + (c.totals?.current_amount ?? c.original_amount),
    0,
  );
  const pendingChanges = contracts.reduce((sum, c) => sum + (c.totals?.pending_changes ?? 0), 0);
  const approvedChanges = contracts.reduce((sum, c) => sum + (c.totals?.approved_changes ?? 0), 0);

  const today = new Date();
  const daysUntilLapse = (s: (typeof subs)[number]) =>
    s.insurance_expires_at
      ? (new Date(s.insurance_expires_at).getTime() - today.getTime()) / 86_400_000
      : null;

  // Expired and about-to-expire are different problems: one is a stop-work
  // issue, the other is a reminder. Rolling them together makes the urgent one
  // look routine.
  const expired = subs.filter((s) => {
    const days = daysUntilLapse(s);
    return days !== null && days < 0;
  });
  const expiringSoon = subs.filter((s) => {
    const days = daysUntilLapse(s);
    return days !== null && days >= 0 && days < INSURANCE_WARNING_DAYS;
  });

  // Nothing has been committed anywhere. The four sections below would each be
  // an empty panel with a disabled button, so none of them render — the ordered
  // path replaces the whole page until there is something to show.
  const untouched =
    subs.length === 0 && packages.length === 0 && contracts.length === 0;

  if (untouched) {
    return (
      <div className="space-y-6">
        <Header />
        <ConstructionSetup
          hasProjects={projects.length > 0}
          hasSubs={subs.length > 0}
          hasPackages={packages.length > 0}
          projects={projectOptions}
          subcontractors={subOptions}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      <section className="card grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        <Stat label="Committed" value={formatCompactCurrency(committed)} />
        <Stat
          label="Approved changes"
          value={formatCompactCurrency(approvedChanges)}
          hint="already in the committed figure"
        />
        <Stat
          label="Pending changes"
          value={formatCompactCurrency(pendingChanges)}
          hint="not yet committed"
          tone={pendingChanges > 0 ? "warn" : undefined}
        />
        <Stat label="Active contracts" value={String(contracts.length)} />
      </section>

      {expired.length > 0 && (
        <p className="flex items-start gap-2.5 rounded-card bg-rose-50 p-4 text-sm text-rose-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>
              {expired.length === 1
                ? "1 subcontractor has lapsed insurance"
                : `${expired.length} subcontractors have lapsed insurance`}
            </strong>{" "}
            — {expired.map((s) => s.company_name).join(", ")}. They should not be on site.
          </span>
        </p>
      )}

      {expiringSoon.length > 0 && (
        <p className="flex items-start gap-2.5 rounded-card bg-orange-50 p-4 text-sm text-orange-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>
              {expiringSoon.length} {expiringSoon.length === 1 ? "certificate" : "certificates"} of
              insurance
            </strong>{" "}
            {expiringSoon.length === 1 ? "expires" : "expire"} within {INSURANCE_WARNING_DAYS} days:{" "}
            {expiringSoon.map((s) => s.company_name).join(", ")}.
          </span>
        </p>
      )}

      {/* Contracts -------------------------------------------------- */}
      <section>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Contracts</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Current value is the original plus approved change orders — computed in
              the database, so it cannot disagree with the orders below.
            </p>
          </div>
          <NewContractForm projects={projectOptions} subcontractors={subOptions} />
        </div>
        <div className="card mt-3 overflow-x-auto">
          <table role="table" className="stacked-table w-full min-w-3xl text-sm">
            <thead role="rowgroup">
              <tr role="row" className="text-left text-xs uppercase tracking-wider text-ink-subtle">
                <th role="columnheader" className="px-5 py-3 font-semibold">Contract</th>
                <th role="columnheader" className="px-5 py-3 font-semibold">Subcontractor</th>
                <th role="columnheader" className="px-5 py-3 font-semibold">Project</th>
                <th role="columnheader" className="px-5 py-3 text-right font-semibold">Original</th>
                <th role="columnheader" className="px-5 py-3 text-right font-semibold">Changes</th>
                <th role="columnheader" className="px-5 py-3 text-right font-semibold">Current</th>
                <th role="columnheader" className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody role="rowgroup" className="divide-y divide-line">
              {contracts.map((c) => {
                const changes = c.totals?.approved_changes ?? 0;
                return (
                  <ClickableRow key={c.id} className="cursor-pointer hover:bg-canvas/60">
                    <td role="cell" className="px-5 py-3">
                      <p className="font-medium">{c.title}</p>
                      <p className="text-xs text-ink-subtle">{c.contract_number}</p>
                    </td>
                    <td role="cell" data-label="Subcontractor" className="px-5 py-3 text-ink-muted">
                      {c.subcontractor.company_name}
                    </td>
                    <td role="cell" data-label="Project" className="px-5 py-3 text-ink-muted">
                      {c.project.name}
                    </td>
                    <td role="cell" data-label="Original" className="px-5 py-3 text-right">
                      {formatCurrency(c.original_amount)}
                    </td>
                    <td
                      role="cell"
                      data-label="Changes"
                      className={`px-5 py-3 text-right ${
                        changes > 0
                          ? "text-status-behind-ink"
                          : changes < 0
                            ? "text-mint-600"
                            : "text-ink-subtle"
                      }`}
                    >
                      {changes === 0
                        ? "—"
                        : `${changes > 0 ? "+" : ""}${formatCurrency(changes)}`}
                    </td>
                    <td role="cell" data-label="Current" className="px-5 py-3 text-right font-semibold">
                      {formatCurrency(c.totals?.current_amount ?? c.original_amount)}
                    </td>
                    <td role="cell" data-cell="action" className="px-5 py-3">
                      <span className="flex items-center gap-2">
                        <StatusPill kind="contract" value={c.status} />
                        <EditContractForm contract={c} />
                      </span>
                    </td>
                  </ClickableRow>
                );
              })}
            </tbody>
          </table>
          {contracts.length === 0 && (
            <EmptyState
              variant="clear"
              icon={FileSignature}
              title="No contracts awarded yet"
            >
              A contract is the committed figure for one company on one job.
            </EmptyState>
          )}
        </div>
      </section>

      {/* Change orders ---------------------------------------------- */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Change orders</h2>
          <NewChangeOrderForm contracts={contractOptions} />
        </div>
        <ul className="card mt-3 divide-y divide-line">
          {changeOrders.length === 0 && (
            <li>
              <EmptyState variant="clear" title="No change orders">
                {contracts.length === 0
                  ? "A change order adjusts a contract, so there is nothing to adjust yet."
                  : "Nothing has moved the committed figure since the contracts were signed."}
              </EmptyState>
            </li>
          )}
          {changeOrders.map((co) => (
            <li key={co.id}>
              <OpenOnClick className="flex cursor-pointer flex-wrap items-start gap-3 p-4 transition-colors hover:bg-canvas/60">
              <div className="min-w-48 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {co.contract.contract_number} · CO {co.number}
                  </p>
                  <StatusPill kind="change" value={co.status} />
                  <Pill tone="neutral">{humanise(co.reason)}</Pill>
                </div>
                <p className="mt-1 text-sm text-ink-muted">{co.description}</p>
                <p className="mt-0.5 text-xs text-ink-subtle">
                  {co.project.name}
                  {co.submitted_at && ` · submitted ${formatDate(co.submitted_at)}`}
                  {co.days_impact !== 0 &&
                    ` · ${co.days_impact > 0 ? "+" : ""}${co.days_impact} days`}
                </p>
              </div>
              <p
                className={`shrink-0 text-right font-semibold ${
                  co.amount < 0 ? "text-mint-600" : "text-ink"
                }`}
              >
                {co.amount > 0 ? "+" : ""}
                {formatCurrency(co.amount)}
              </p>
              <EditChangeOrderForm changeOrder={co} />
              </OpenOnClick>
            </li>
          ))}
        </ul>
      </section>

      {/* Bid packages ----------------------------------------------- */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Bid packages</h2>
          <div className="flex flex-wrap gap-2">
            <NewQuoteForm packages={packageOptions} subcontractors={subOptions} />
            <NewBidPackageForm projects={projectOptions} />
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {packages.length === 0 && (
            <div className="card">
              <EmptyState variant="clear" icon={Layers} title="No bid packages out">
                A package is a scope you want priced. Quotes come back against it
                and are compared side by side, low bid marked.
              </EmptyState>
            </div>
          )}
          {packages.map((pkg) => {
            const sorted = [...pkg.quotes].sort((a, b) => a.amount - b.amount);
            const low = sorted[0];

            return (
              <OpenOnClick key={pkg.id} className="card cursor-pointer p-5 transition-shadow hover:shadow-lift">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold tracking-tight">{pkg.name}</h3>
                      <StatusPill kind="bid" value={pkg.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{pkg.scope_description}</p>
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      {pkg.project.name}
                      {pkg.due_at && ` · due ${formatDate(pkg.due_at)}`}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <p className="text-xs text-ink-subtle">Budget</p>
                      <p className="font-semibold">
                        {pkg.budget ? formatCurrency(pkg.budget) : "—"}
                      </p>
                    </div>
                    <EditBidPackageForm bidPackage={pkg} />
                  </div>
                </div>

                {pkg.quotes.length > 0 && (
                  <ul className="mt-4 divide-y divide-line border-t border-line">
                    {sorted.map((quote) => {
                      const overBudget = pkg.budget !== null && quote.amount > pkg.budget;
                      return (
                        <li
                          key={quote.id}
                          className="flex flex-wrap items-center gap-3 py-2.5"
                        >
                          <div className="min-w-40 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">
                                {quote.subcontractor.company_name}
                              </p>
                              {quote.id === low?.id && pkg.quotes.length > 1 && (
                                <Pill tone="info">Low bid</Pill>
                              )}
                              <StatusPill kind="offer" value={quote.status} />
                            </div>
                            {/* Exclusions are why the cheapest bid is often not
                                the cheapest job, so they sit next to the price. */}
                            {quote.exclusions && (
                              <p className="text-xs text-ink-subtle">{quote.exclusions}</p>
                            )}
                          </div>
                          {quote.duration_days && (
                            <p className="shrink-0 text-xs text-ink-muted">
                              {quote.duration_days} days
                            </p>
                          )}
                          <EditQuoteForm quote={quote} />
                          <p
                            className={`w-28 shrink-0 text-right font-semibold ${
                              overBudget ? "text-status-behind-ink" : ""
                            }`}
                          >
                            {formatCurrency(quote.amount)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </OpenOnClick>
            );
          })}
        </div>
      </section>

      {/* Subcontractors --------------------------------------------- */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Subcontractors</h2>
          <NewSubcontractorForm />
        </div>
        {subs.length === 0 && (
          <div className="card mt-3">
            <EmptyState variant="clear" icon={Users} title="No subcontractors yet">
              The companies you award work to. Insurance expiry is tracked here
              and warned about before it lapses.
            </EmptyState>
          </div>
        )}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {subs.map((sub) => {
            const expires = sub.insurance_expires_at ? new Date(sub.insurance_expires_at) : null;
            const days = expires
              ? (expires.getTime() - today.getTime()) / 86_400_000
              : null;

            return (
              <OpenOnClick key={sub.id} className="card cursor-pointer p-4 transition-shadow hover:shadow-lift">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{sub.company_name}</p>
                    <p className="text-sm text-ink-muted">{humanise(sub.trade)}</p>
                  </div>
                  <EditSubcontractorForm subcontractor={sub} />
                  {sub.rating !== null && (
                    <span className="flex shrink-0 items-center gap-1 text-sm font-medium">
                      <Star className="size-3.5 fill-current text-status-behind-ink" />
                      {sub.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {sub.is_approved ? (
                    <Pill tone="good">Approved</Pill>
                  ) : (
                    <Pill tone="warn">Not approved</Pill>
                  )}
                  {days === null ? (
                    <Pill tone="bad">No insurance on file</Pill>
                  ) : days < 0 ? (
                    <Pill tone="bad">Insurance expired</Pill>
                  ) : days < INSURANCE_WARNING_DAYS ? (
                    <Pill tone="warn">Insurance expires {formatDate(sub.insurance_expires_at!)}</Pill>
                  ) : (
                    <Pill tone="neutral">Insured to {formatDate(sub.insurance_expires_at!)}</Pill>
                  )}
                </div>

                {sub.contact_name && (
                  <p className="mt-3 text-xs text-ink-subtle">
                    {sub.contact_name} · {sub.phone}
                  </p>
                )}
              </OpenOnClick>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Construction</h1>
      <p className="mt-1 text-sm text-ink-muted">
        What has been committed to other companies, across every job.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "warn";
}) {
  return (
    <div>
      <p className="text-xs text-ink-subtle">{label}</p>
      <p
        className={`mt-0.5 text-lg font-semibold tracking-tight ${
          tone === "warn" ? "text-status-behind-ink" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}
