import { Pill, StatusPill, humanise } from "@/components/phases/badges";
import { OpenOnClick } from "@/components/phases/open-on-click";
import { EditBuildingForm, EditUnitForm, NewUnitForm } from "./building-forms";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";
import type { BuildingWithTotals, Unit } from "@/lib/types";

/**
 * A building and what is in it.
 *
 * The units are on the card rather than behind it, for the same reason quotes
 * sit on a bid package: a building with no units is an empty shell, and the
 * question anyone actually has — how many are left — is answered by the list,
 * not by opening something.
 *
 * The three sales figures are counted from those units by the database, so a
 * unit closing moves them and nothing has to be remembered. A stored copy is a
 * second version of the truth, and it is always the copy that goes stale.
 */
export function BuildingCard({ building }: { building: BuildingWithTotals }) {
  const totals = building.totals;
  const sold = totals?.units_sold ?? 0;
  const count = totals?.unit_count ?? building.units.length;
  const soldShare = count > 0 ? (sold / count) * 100 : 0;

  return (
    <OpenOnClick className="card group flex cursor-pointer flex-col p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
            {humanise(building.building_type)}
          </span>
          <h3 className="mt-0.5 font-semibold leading-snug tracking-tight group-hover:text-brand-700">
            {building.name}
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            {building.floors} {building.floors === 1 ? "floor" : "floors"}
            {building.gross_sqft ? ` · ${building.gross_sqft.toLocaleString()} sqft` : ""}
            {building.permit_number ? ` · permit ${building.permit_number}` : ""}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <StatusPill kind="build" value={building.status} />
          <EditBuildingForm building={building} />
        </span>
      </div>

      {/* Sales. Shown even at zero: "none sold yet" on a building under
          construction is the expected state, and hiding it would make a
          building that has sold nothing look like one that cannot. */}
      <div className="mt-4 rounded-tile bg-canvas p-3">
        <div className="flex items-baseline justify-between gap-3 text-xs text-ink-muted">
          <span>
            <span className="font-semibold tabular-nums text-ink">{sold}</span> of{" "}
            <span className="tabular-nums">{count}</span> sold
          </span>
          <span className="font-semibold tabular-nums text-ink">
            {formatCompactCurrency(totals?.sales_revenue ?? 0)}
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line"
          role="img"
          aria-label={`${sold} of ${count} units sold`}
        >
          <div className="h-full rounded-full bg-mint-600" style={{ width: `${soldShare}%` }} />
        </div>
        {(totals?.unsold_list_value ?? 0) > 0 && (
          <p className="mt-2 text-[11px] text-ink-subtle">
            {formatCompactCurrency(totals!.unsold_list_value)} still listed
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Units</h4>
        <NewUnitForm buildingId={building.id} />
      </div>

      {building.units.length === 0 ? (
        <p className="mt-2 text-sm text-ink-subtle">
          None yet. Units are what the sales figures above are counted from.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line border-t border-line">
          {building.units.map((unit) => (
            <li key={unit.id}>
              {/* Its own scope, so clicking a unit opens the unit rather than
                  the building it sits inside. */}
              <OpenOnClick className="flex cursor-pointer flex-wrap items-center gap-2 py-2.5">
                <span className="min-w-24 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium tabular-nums">{unit.unit_number}</span>
                    {unit.unit_type && (
                      <span className="text-xs text-ink-muted">{unit.unit_type}</span>
                    )}
                    <StatusPill kind="unit" value={unit.status} />
                  </span>
                  {unit.sqft && (
                    <span className="block text-xs text-ink-subtle">
                      {unit.sqft.toLocaleString()} sqft
                      {unit.bedrooms !== null && ` · ${unit.bedrooms} bed`}
                      {unit.bathrooms !== null && ` · ${unit.bathrooms} bath`}
                    </span>
                  )}
                </span>
                <EditUnitForm unit={unit} />
                <UnitPrice unit={unit} />
              </OpenOnClick>
            </li>
          ))}
        </ul>
      )}
    </OpenOnClick>
  );
}

/**
 * What the unit is worth, and which kind of figure it is.
 *
 * A sold unit shows what it closed at; anything else shows what it is asking.
 * They are not the same number and a column that mixes them silently is how a
 * forecast gets read as revenue.
 */
function UnitPrice({ unit }: { unit: Unit }) {
  if (unit.status === "sold") {
    const over = unit.list_price !== null && unit.sold_price !== null && unit.sold_price > unit.list_price;
    return (
      <span className="shrink-0 text-right">
        <span className="block font-semibold tabular-nums">
          {unit.sold_price !== null ? formatCurrency(unit.sold_price) : "—"}
        </span>
        {unit.list_price !== null && unit.sold_price !== null && unit.sold_price !== unit.list_price && (
          <span className={`block text-[11px] ${over ? "text-mint-600" : "text-ink-subtle"}`}>
            {over ? "+" : ""}
            {formatCurrency(unit.sold_price - unit.list_price)} vs list
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="shrink-0 text-right">
      <span className="block font-semibold tabular-nums text-ink-muted">
        {unit.list_price !== null ? formatCurrency(unit.list_price) : "—"}
      </span>
      <span className="block text-[11px] text-ink-subtle">listed</span>
    </span>
  );
}

/** Nothing at all, on a project that has not been broken into buildings yet. */
export function NoBuildings() {
  return (
    <p className="card p-5 text-sm text-ink-muted">
      No buildings yet. A building is what units belong to — add one and the
      unit count, units sold and sales revenue are counted from it.{" "}
      <Pill tone="neutral">Optional on a single-structure job</Pill>
    </p>
  );
}
