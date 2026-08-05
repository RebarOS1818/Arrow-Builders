import { AlertTriangle, Database, Info } from "lucide-react";
import { inspectWorkspace } from "@/lib/smartsuite/inspect";
import { isSmartSuiteConfigured, missingSmartSuiteEnv } from "@/lib/smartsuite/config";

export const dynamic = "force-dynamic";

/**
 * What is in the SmartSuite workspace, before anything is moved out of it.
 *
 * This page reads and reports; it writes nothing, to SmartSuite or to this
 * app's database. It exists because the mapping is the hard part of a
 * migration and the loading is the easy part — and the mapping cannot be
 * agreed from a schema nobody has looked at.
 */
export default async function ImportPage() {
  if (!isSmartSuiteConfigured) {
    return (
      <div className="max-w-3xl space-y-4">
        <Header />
        <div className="card flex items-start gap-2.5 p-5 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
          <div>
            <p className="font-medium">SmartSuite is not connected yet.</p>
            <p className="mt-1 text-ink-muted">
              Set{" "}
              {missingSmartSuiteEnv.map((name, i) => (
                <span key={name}>
                  {i > 0 && " and "}
                  <code className="font-mono text-xs">{name}</code>
                </span>
              ))}{" "}
              in Vercel, then redeploy. The API key is read from the server only
              and is never sent to the browser.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const report = await inspectWorkspace();

  if (!report.ok) {
    return (
      <div className="max-w-3xl space-y-4">
        <Header />
        <div className="card flex items-start gap-2.5 p-5 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-risk" />
          <p>{report.error}</p>
        </div>
      </div>
    );
  }

  const tableCount = report.solutions.reduce((n, s) => n + (s.tables?.length ?? 0), 0);
  const rowCount = report.solutions.reduce(
    (n, s) => n + (s.tables ?? []).reduce((m, t) => m + (t.rows ?? 0), 0),
    0,
  );

  return (
    <div className="max-w-4xl space-y-5">
      <Header />

      <div className="flex flex-wrap gap-3">
        <Stat label="Solutions" value={report.solutions.length} />
        <Stat label="Tables" value={tableCount} />
        <Stat label="Records" value={rowCount} />
      </div>

      {report.solutions.map((solution) => (
        <section key={solution.id} className="card p-5">
          <div className="flex items-center gap-2.5">
            <span className="icon-tile size-9 bg-brand-700 text-accent-500">
              <Database className="size-4.5" />
            </span>
            <div>
              <h2 className="font-semibold tracking-tight">{solution.solution}</h2>
              <p className="font-mono text-xs text-ink-subtle">{solution.id}</p>
            </div>
          </div>

          {solution.error && (
            <p className="mt-3 rounded-tile bg-rose-50 p-3 text-sm text-status-risk">
              {solution.error}
            </p>
          )}

          <div className="mt-4 space-y-3">
            {(solution.tables ?? []).map((table) => (
              <div key={table.id} className="well p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold tracking-tight">{table.name}</h3>
                  <span className="pill-quiet">
                    {table.rows === null ? "count unavailable" : `${table.rows} records`}
                  </span>
                </div>

                {table.error && (
                  <p className="mt-2 text-xs text-status-risk">{table.error}</p>
                )}

                {/* Every column, not a sample: a field left out here is a field
                    that quietly fails to arrive in the migration. */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {table.fields.map((field) => (
                    <span key={field.slug} className="pill-quiet" title={field.slug}>
                      {field.label}
                      <span className="text-ink-subtle">· {field.type}</span>
                    </span>
                  ))}
                  {table.fields.length === 0 && (
                    <span className="text-xs text-ink-subtle">No columns reported.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Import from SmartSuite</h1>
      <p className="mt-1 text-sm text-ink-muted">
        A read-only look at the workspace. Nothing here changes SmartSuite, and
        nothing is written to this app until the mapping is agreed.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card min-w-32 flex-1 p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}
