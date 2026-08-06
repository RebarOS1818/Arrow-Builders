import { AlertTriangle, FileSignature, GitPullRequest, Layers, Users } from "lucide-react";
import {
  BidPackageCard,
  ChangeOrderCard,
  INSURANCE_WARNING_DAYS,
  SubcontractorCard,
} from "@/components/construction/cards";
import { ContractCard } from "@/components/construction/contract-card";
import { ConstructionSetup } from "@/components/construction/setup";
import { ViewTabs, viewFrom } from "@/components/construction/view-tabs";
import {
  NewBidPackageForm,
  NewChangeOrderForm,
  NewContractForm,
  NewQuoteForm,
  NewSubcontractorForm,
} from "@/components/phases/forms";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getBidPackages,
  getChangeOrders,
  getContracts,
  getProjects,
  getSubcontractors,
} from "@/lib/data";
import { formatCompactCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Construction, shaped like Projects.
 *
 * Projects reads as one thing: a heading, a line of summary, and one grid of one
 * kind of card. This page held four record types stacked as tables and lists, so
 * the money — the only reason anyone opens it — was a column in the third
 * section, below two others you had to scroll past. Same records, same actions;
 * they take turns now instead of queueing, and each is a card.
 */
export default async function ConstructionPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ view: viewParam }, subs, packages, contracts, changeOrders, projects] =
    await Promise.all([
      searchParams,
      getSubcontractors(),
      getBidPackages(),
      getContracts(),
      getChangeOrders(),
      getProjects(),
    ]);

  const view = viewFrom(viewParam);

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

  // Nothing committed anywhere. Every view would be an empty grid with a
  // disabled button on top, so the ordered path replaces the page instead.
  if (subs.length === 0 && packages.length === 0 && contracts.length === 0) {
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

  const counts = {
    contracts: contracts.length,
    changes: changeOrders.length,
    bids: packages.length,
    subs: subs.length,
  };

  // The primary action belongs to whatever is on screen. One button that
  // changes with the view beats four competing for the same corner.
  const action = {
    contracts: <NewContractForm projects={projectOptions} subcontractors={subOptions} />,
    changes: <NewChangeOrderForm contracts={contractOptions} />,
    bids: (
      <div className="flex flex-wrap gap-2">
        <NewQuoteForm packages={packageOptions} subcontractors={subOptions} />
        <NewBidPackageForm projects={projectOptions} />
      </div>
    ),
    subs: <NewSubcontractorForm />,
  }[view];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Header
          summary={
            <>
              {formatCompactCurrency(committed)} committed across {contracts.length}{" "}
              {contracts.length === 1 ? "contract" : "contracts"}
              {pendingChanges !== 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-status-behind-ink">
                    {formatCompactCurrency(pendingChanges)} pending
                  </span>
                </>
              )}
            </>
          }
        />
        {action}
      </div>

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

      <ViewTabs view={view} counts={counts} />

      {view === "contracts" &&
        (contracts.length === 0 ? (
          <EmptyState icon={FileSignature} title="No contracts awarded yet">
            A contract is the committed figure for one company on one job. Change
            orders adjust it from there.
          </EmptyState>
        ) : (
          <Grid>
            {contracts.map((c) => (
              <ContractCard key={c.id} contract={c} />
            ))}
          </Grid>
        ))}

      {view === "changes" &&
        (changeOrders.length === 0 ? (
          <EmptyState icon={GitPullRequest} title="No change orders">
            {contracts.length === 0
              ? "A change order adjusts a contract, so there is nothing to adjust yet."
              : "Nothing has moved the committed figure since the contracts were signed."}
          </EmptyState>
        ) : (
          <Grid>
            {changeOrders.map((co) => (
              <ChangeOrderCard key={co.id} order={co} />
            ))}
          </Grid>
        ))}

      {view === "bids" &&
        (packages.length === 0 ? (
          <EmptyState icon={Layers} title="No bid packages out">
            A package is a scope you want priced. Quotes come back against it and
            are compared side by side, low bid marked.
          </EmptyState>
        ) : (
          <Grid>
            {packages.map((pkg) => (
              <BidPackageCard key={pkg.id} bidPackage={pkg} />
            ))}
          </Grid>
        ))}

      {view === "subs" &&
        (subs.length === 0 ? (
          <EmptyState icon={Users} title="No subcontractors yet">
            The companies you award work to. Insurance expiry is tracked here and
            warned about before it lapses.
          </EmptyState>
        ) : (
          <Grid>
            {subs.map((sub) => (
              <SubcontractorCard key={sub.id} sub={sub} today={today} />
            ))}
          </Grid>
        ))}
    </div>
  );
}

/** Projects' proportions exactly, so the two pages read as the same app. */
function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
      {children}
    </div>
  );
}

function Header({ summary }: { summary?: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Construction</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {summary ?? "What has been committed to other companies, across every job."}
      </p>
    </div>
  );
}
