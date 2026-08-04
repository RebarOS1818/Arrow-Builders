import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Columns3, LayoutGrid, MapPin } from "lucide-react";
import { StatusPill } from "@/components/phases/badges";
import { NewPropertyForm } from "@/components/phases/forms";
import { PropertyBoard } from "@/components/phases/property-board";
import { getConstraints, getPropertiesSourced, getProFormas, getStudies } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatCompactCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Every parcel under consideration, with enough of its assessment to triage
 * without opening it: how far the studies have got, whether anything fatal has
 * been found, and whether the numbers work.
 */
export default async function DevelopmentPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  // Grid stays reachable: it carries study counts, margin and blockers, which
  // the board deliberately leaves out to keep a column scannable.
  const view = (await searchParams).view === "grid" ? "grid" : "board";
  const [source, studies, constraints, proFormas] = await Promise.all([
    getPropertiesSourced(),
    getStudies(),
    getConstraints(),
    getProFormas(),
  ]);
  const properties = source.rows;

  const live = properties.filter((p) => p.status !== "passed");
  const pipelineValue = live.reduce((sum, p) => sum + (p.asking_price ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Development</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {live.length} live {live.length === 1 ? "parcel" : "parcels"} ·{" "}
            {formatCompactCurrency(pipelineValue)} asking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full bg-surface p-0.5 shadow-soft">
            <Link
              href="/development"
              aria-current={view === "board" ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                view === "board"
                  ? "bg-brand-600 font-semibold text-white"
                  : "font-medium text-ink-muted hover:text-ink"
              }`}
            >
              <Columns3 className="size-4" />
              Board
            </Link>
            <Link
              href="/development?view=grid"
              aria-current={view === "grid" ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                view === "grid"
                  ? "bg-brand-600 font-semibold text-white"
                  : "font-medium text-ink-muted hover:text-ink"
              }`}
            >
              <LayoutGrid className="size-4" />
              Grid
            </Link>
          </div>
          <NewPropertyForm />
        </div>
      </div>

      {/* Sample data pretending to be real is how a board "stops saving": the
          rows on screen do not exist in the database, so every write matches
          nothing. Said loudly, with the database's own reason. In plain demo
          mode (no Supabase at all) the app already says so elsewhere. */}
      {source.demo && isSupabaseConfigured && (
        <div className="rounded-tile bg-rose-50 p-4 text-sm text-status-risk" role="alert">
          <p className="font-semibold">
            These are sample parcels — your database could not be read.
          </p>
          <p className="mt-1">
            It answered: &ldquo;{source.reason}&rdquo;. Changes made here will not
            save. If the properties table is missing, run{" "}
            <code className="font-mono text-xs">0008_development_phase.sql</code>{" "}
            in the Supabase SQL editor.
          </p>
        </div>
      )}

      {view === "board" && <PropertyBoard properties={properties} />}

      {view === "grid" && (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {properties.map((property) => {
          const theirStudies = studies.filter((s) => s.property_id === property.id);
          const done = theirStudies.filter((s) => s.status === "complete").length;
          const blockers = constraints.filter(
            (c) => c.property_id === property.id && !c.resolved && c.severity === "fatal",
          );
          const unfavorable = theirStudies.filter((s) => s.verdict === "unfavorable");
          const best = proFormas
            .filter((p) => p.property_id === property.id)
            .sort((a, b) => b.projected_profit - a.projected_profit)[0];

          // Margin on cost, which is what tells you whether the price works.
          const margin =
            best && best.total_cost > 0
              ? (best.projected_profit / best.total_cost) * 100
              : null;

          return (
            <Link
              key={property.id}
              href={`/development/${property.id}`}
              className="card pressable block p-5 transition-shadow hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold tracking-tight">
                      {property.name}
                    </h2>
                    <StatusPill kind="property" value={property.status} />
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {[property.city, property.state].filter(Boolean).join(", ") || "—"}
                      {property.lot_size_acres ? ` · ${property.lot_size_acres} acres` : ""}
                      {property.zoning_code ? ` · ${property.zoning_code}` : ""}
                    </span>
                  </p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-ink-subtle" />
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-3">
                <Figure
                  label="Asking"
                  value={
                    property.asking_price ? formatCompactCurrency(property.asking_price) : "—"
                  }
                />
                <Figure
                  label="Studies"
                  value={theirStudies.length ? `${done} of ${theirStudies.length}` : "None"}
                />
                <Figure
                  label="Margin"
                  value={margin === null ? "—" : `${margin.toFixed(1)}%`}
                  tone={margin !== null && margin < 10 ? "warn" : undefined}
                />
              </dl>

              {(blockers.length > 0 || unfavorable.length > 0) && (
                <p className="mt-3 flex items-start gap-2 rounded-tile bg-rose-50 p-2.5 text-xs text-status-risk">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {blockers.length > 0 && `${blockers[0]!.kind}: ${blockers[0]!.description}`}
                    {blockers.length === 0 &&
                      unfavorable.length > 0 &&
                      `${unfavorable[0]!.kind} study came back unfavorable.`}
                  </span>
                </p>
              )}

              <p className="mt-3 text-xs text-ink-subtle">
                Identified {formatDate(property.identified_at)}
              </p>
            </Link>
          );
        })}
      </div>
      )}

      {properties.length === 0 && (
        <p className="card p-8 text-center text-sm text-ink-muted">
          No properties yet. Parcels you are assessing will appear here.
        </p>
      )}
    </div>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div>
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd
        className={`mt-0.5 font-semibold ${tone === "warn" ? "text-status-behind-ink" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}
