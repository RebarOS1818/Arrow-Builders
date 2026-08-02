import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Pill, StatusPill, humanise } from "@/components/phases/badges";
import { MapLink, mapsQuery, mapsUrl } from "@/components/phases/map-link";
import {
  NewComparableForm,
  NewConstraintForm,
  NewOfferForm,
  NewProFormaForm,
  NewStudyForm,
} from "@/components/phases/forms";
import {
  getComparables,
  getConstraints,
  getOffers,
  getProFormas,
  getProperty,
  getStudies,
} from "@/lib/data";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getProperty(id);
  if (!property) notFound();

  const [studies, constraints, proFormas, comparables, offers] = await Promise.all([
    getStudies(id),
    getConstraints(id),
    getProFormas(id),
    getComparables(id),
    getOffers(id),
  ]);

  const priced = comparables.filter((c) => c.sale_price && c.lot_size_acres);
  // Per-acre is the comparison that works for raw land; per-sqft needs a building.
  const avgPerAcre = priced.length
    ? priced.reduce((sum, c) => sum + c.sale_price! / c.lot_size_acres!, 0) / priced.length
    : null;
  const impliedValue =
    avgPerAcre && property.lot_size_acres ? avgPerAcre * property.lot_size_acres : null;

  return (
    <div className="space-y-5">
      <Link
        href="/development"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All properties
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{property.name}</h1>
            <StatusPill kind="property" value={property.status} />
          </div>
          <MapLink
            className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-muted"
            address={property.address}
            city={property.city}
            state={property.state}
            suffix={property.parcel_number ? ` · APN ${property.parcel_number}` : undefined}
          />
        </div>
      </div>

      <section className="card grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        <Stat label="Asking price" value={property.asking_price ? formatCurrency(property.asking_price) : "—"} />
        <Stat label="Lot size" value={property.lot_size_acres ? `${property.lot_size_acres} acres` : "—"} />
        <Stat label="Zoning" value={property.zoning_code ?? "—"} />
        <Stat
          label="Comps imply"
          value={impliedValue ? formatCompactCurrency(impliedValue) : "—"}
          hint={
            impliedValue && property.asking_price
              ? `${impliedValue >= property.asking_price ? "Above" : "Below"} asking`
              : undefined
          }
        />
      </section>

      {/* Feasibility ------------------------------------------------ */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Feasibility</h2>
          <NewStudyForm propertyId={property.id} />
        </div>
        <div className="card mt-3 divide-y divide-line">
          {studies.length === 0 && (
            <p className="p-5 text-sm text-ink-muted">No studies ordered yet.</p>
          )}
          {studies.map((study) => (
            <div key={study.id} className="flex flex-wrap items-start gap-3 p-4">
              <div className="min-w-40 flex-1">
                <p className="font-medium">{humanise(study.kind)}</p>
                {study.consultant && (
                  <p className="text-xs text-ink-subtle">{study.consultant}</p>
                )}
                {study.findings && (
                  <p className="mt-1 text-sm text-ink-muted">{study.findings}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusPill kind="study" value={study.status} />
                {/* A verdict only exists once the study is finished — the
                    database refuses the combination, so the gap here is real
                    information rather than missing data. */}
                <StatusPill kind="verdict" value={study.verdict} />
              </div>
              <p className="w-24 shrink-0 text-right text-sm text-ink-muted">
                {study.cost ? formatCurrency(study.cost) : "—"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Constraints ------------------------------------------------ */}
      <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Site constraints</h2>
            <NewConstraintForm propertyId={property.id} />
          </div>
          <ul className="card mt-3 divide-y divide-line">
            {constraints.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start gap-3 p-4">
                <div className="min-w-40 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{c.kind}</p>
                    <StatusPill kind="severity" value={c.severity} />
                    {c.resolved && <Pill tone="good">Resolved</Pill>}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{c.description}</p>
                </div>
                {c.affects_buildable_area && !c.resolved && (
                  <Pill tone="warn">Reduces buildable area</Pill>
                )}
              </li>
            ))}
          </ul>
        </section>

      {/* Pro formas ------------------------------------------------- */}
      <section>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Pro formas</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Totals and profit are computed in the database from the inputs, so they
              cannot drift from them.
            </p>
          </div>
          <NewProFormaForm propertyId={property.id} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {proFormas.length === 0 && (
            <p className="card p-5 text-sm text-ink-muted">No scenarios yet.</p>
          )}
          {proFormas.map((pf) => {
            const margin = pf.total_cost > 0 ? (pf.projected_profit / pf.total_cost) * 100 : 0;
            const belowTarget = margin < pf.target_margin_pct;

            return (
              <article key={pf.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold tracking-tight">{pf.scenario}</h3>
                  <StatusPill kind="offer" value={pf.status} />
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {pf.planned_units} units · {pf.planned_sqft.toLocaleString()} sqft
                </p>

                <dl className="mt-4 space-y-1.5 text-sm">
                  <Row label="Acquisition" value={formatCurrency(pf.acquisition_cost)} />
                  <Row label="Hard costs" value={formatCurrency(pf.hard_costs)} />
                  <Row label="Soft costs" value={formatCurrency(pf.soft_costs)} />
                  <Row label="Financing" value={formatCurrency(pf.financing_costs)} />
                  <Row label={`Contingency (${pf.contingency_pct}%)`} value="on hard + soft" muted />
                  <Row label="Total cost" value={formatCurrency(pf.total_cost)} strong />
                  <Row label="Projected revenue" value={formatCurrency(pf.projected_revenue)} />
                </dl>

                <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
                  <div>
                    <p className="text-xs text-ink-subtle">Projected profit</p>
                    <p
                      className={`text-xl font-semibold ${
                        pf.projected_profit < 0 ? "text-status-risk" : "text-ink"
                      }`}
                    >
                      {formatCurrency(pf.projected_profit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-subtle">
                      Margin · target {pf.target_margin_pct}%
                    </p>
                    <p
                      className={`text-xl font-semibold ${
                        belowTarget ? "text-status-behind" : "text-mint-600"
                      }`}
                    >
                      {margin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Comparables ------------------------------------------------ */}
      <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Comparable sales</h2>
            <NewComparableForm propertyId={property.id} />
          </div>
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full min-w-lg text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink-subtle">
                  <th className="px-5 py-3 font-semibold">Address</th>
                  <th className="px-5 py-3 font-semibold">Sold</th>
                  <th className="px-5 py-3 text-right font-semibold">Price</th>
                  <th className="px-5 py-3 text-right font-semibold">Acres</th>
                  <th className="px-5 py-3 text-right font-semibold">Per acre</th>
                  <th className="px-5 py-3 text-right font-semibold">Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {comparables.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-3 font-medium">
                      {/* A comp is near the parcel by definition, so its own
                          city fills the gap when the row only carries a street. */}
                      {mapsQuery({ address: c.address, city: property.city }) ? (
                        <a
                          href={mapsUrl(
                            mapsQuery({
                              address: c.address,
                              city: property.city,
                              state: property.state,
                            })!,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open in Google Maps"
                          className="underline decoration-dotted underline-offset-4 hover:text-brand-700 hover:decoration-solid"
                        >
                          {c.address}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {c.sale_date ? formatDate(c.sale_date) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {c.sale_price ? formatCurrency(c.sale_price) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-ink-muted">
                      {c.lot_size_acres ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {c.sale_price && c.lot_size_acres
                        ? formatCompactCurrency(c.sale_price / c.lot_size_acres)
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-ink-muted">
                      {c.distance_miles ? `${c.distance_miles} mi` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      {/* Offers ----------------------------------------------------- */}
      <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Offers</h2>
            <NewOfferForm propertyId={property.id} />
          </div>
          <ul className="card mt-3 divide-y divide-line">
            {offers.map((offer) => (
              <li key={offer.id} className="flex flex-wrap items-start gap-3 p-4">
                <div className="min-w-40 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{formatCurrency(offer.amount)}</p>
                    <StatusPill kind="offer" value={offer.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-ink-subtle">
                    Offered {formatDate(offer.offered_at)}
                    {offer.due_diligence_days && ` · ${offer.due_diligence_days}-day diligence`}
                    {offer.earnest_money && ` · ${formatCurrency(offer.earnest_money)} earnest`}
                  </p>
                  {offer.notes && <p className="mt-1 text-sm text-ink-muted">{offer.notes}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-ink-subtle">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tracking-tight">{value}</p>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={muted ? "text-ink-subtle" : "text-ink-muted"}>{label}</dt>
      <dd className={strong ? "font-semibold" : muted ? "text-ink-subtle" : ""}>{value}</dd>
    </div>
  );
}
