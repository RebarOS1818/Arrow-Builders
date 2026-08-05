import "server-only";

import {
  getApplication,
  listApplications,
  listRecords,
  listSolutions,
  unwrap,
  type Application,
  type Solution,
} from "./client";
import { SMARTSUITE_SOLUTION_ID } from "./config";

export type TableReport = {
  id: string;
  name: string;
  rows: number | null;
  error?: string;
  fields: { slug: string; label: string; type: string }[];
};

export type SolutionReport = {
  solution: string;
  id: string;
  tables?: TableReport[];
  error?: string;
};

/**
 * What is actually in the workspace: solutions, their tables, each table's
 * columns and row count.
 *
 * Read-only, deliberately. Nothing is written to SmartSuite and nothing is
 * written to this app's database — a migration whose first action is a write is
 * one whose mistakes are already permanent.
 */
export async function inspectWorkspace(): Promise<
  { ok: true; solutions: SolutionReport[] } | { ok: false; error: string; status: number }
> {
  const solutions = await listSolutions();
  if (!solutions.ok) {
    return { ok: false, error: solutions.error, status: solutions.status };
  }

  const all = unwrap<Solution>(solutions.data);
  // One solution when it is named, every solution when it is not — the first
  // look wants the whole workspace, later runs usually want one corner of it.
  const wanted = SMARTSUITE_SOLUTION_ID
    ? all.filter((s) => s.id === SMARTSUITE_SOLUTION_ID)
    : all;

  const report: SolutionReport[] = [];

  for (const solution of wanted) {
    const apps = await listApplications(solution.id);
    if (!apps.ok) {
      report.push({ solution: solution.name, id: solution.id, error: apps.error });
      continue;
    }

    const tables = [];
    for (const app of unwrap<Application>(apps.data)) {
      // The list endpoint omits the field structure, so each table is fetched
      // individually. Slow, and correct — the columns are the entire point.
      const detail = await getApplication(app.id);
      const fields = detail.ok ? (detail.data.structure ?? []) : [];

      const sample = await listRecords(app.id, 1, 0);

      tables.push({
        id: app.id,
        name: app.name,
        rows: sample.ok ? sample.data.total : null,
        error: sample.ok ? undefined : sample.error,
        fields: fields.map((f) => ({
          slug: f.slug,
          label: f.label,
          type: f.field_type,
        })),
      });
    }

    report.push({ solution: solution.name, id: solution.id, tables });
  }

  return { ok: true, solutions: report };
}
