import "server-only";

import { createClient } from "./supabase/server";
import {
  DEMO_ORG,
  DEMO_TODAY,
  demoApprovals,
  demoCashFlow,
  demoDocuments,
  demoEventCrew,
  demoEvents,
  demoMetrics,
  demoMilestones,
  demoProfiles,
  demoProjects,
  demoTasks,
} from "./demo-data";
import {
  demoBidPackages,
  demoBuildings,
  demoChangeOrders,
  demoComparables,
  demoConstraints,
  demoContractTotals,
  demoContracts,
  demoOffers,
  demoProFormas,
  demoProperties,
  demoQuotes,
  demoStudies,
  demoSubcontractors,
  demoUnits,
} from "./demo-phases";
import type {
  BidPackageWithQuotes,
  ChangeOrderWithContract,
  Comparable,
  ContractTotal,
  ContractWithParties,
  FeasibilityStudy,
  Offer,
  ProForma,
  Property,
  SiteConstraint,
  Subcontractor,
  ApprovalWithProject,
  CashFlowPoint,
  DashboardMetrics,
  DocumentRecord,
  EventWithProject,
  Milestone,
  Profile,
  Project,
  TaskWithProject,
} from "./types";

/**
 * Reads go through Supabase when it is configured, and show the demo dataset
 * when it is not.
 *
 * The demo data is only ever for the unconfigured case. It used to cover query
 * failures too, on the theory that a half-migrated database should degrade to a
 * readable page rather than crash — and that was badly wrong. A real account
 * with one column missing got a Documents page listing five files that do not
 * exist, with plausible names, sizes and dates, indistinguishable from its own.
 * The failure that is easy to recover from is the one you can see.
 *
 * So a configured project that errors gets nothing rather than something
 * invented: lists come back empty and the page shows its empty state. That is
 * still not the truth, but it is far closer to it than fabricated rows, and the
 * error reaches the server log with the reader named, so the cause is findable
 * instead of silent.
 *
 * An empty result was never a fallback trigger and still is not — zero rows is
 * a legitimate state for a new organization.
 */
async function withFallback<T>(
  /** The reader's own name, so a failure in the log says which one. */
  label: string,
  query: (db: NonNullable<Awaited<ReturnType<typeof createClient>>>) => Promise<T | null>,
  demo: () => T,
): Promise<T> {
  const db = await createClient();
  if (!db) return demo();

  try {
    const result = await query(db);
    if (result !== null && result !== undefined) return byId(label, result);
    console.error(`[data] ${label} returned no result`);
    return blank(demo());
  } catch (error) {
    console.error(`[data] ${label} failed:`, error);
    return blank(demo());
  }
}

/**
 * One row per primary key.
 *
 * Not defensive tidying — an invariant. A list of records cannot legitimately
 * contain the same id twice, so a repeat is always a fault, and the only
 * question is whether it is a visible one.
 *
 * It was not. Duplicate foreign keys made PostgREST join a parent embed twice
 * and return every row two times, which on a list is odd enough to query and on
 * a total is invisible: the approvals page read "$152,640 awaiting sign-off"
 * against a real $76,320, and nothing on the screen disagreed with it. 0016
 * drops the constraints that caused it; this makes sure the next one shows up
 * in the log rather than in a number somebody trusts.
 */
function byId<T>(label: string, value: T): T {
  if (!Array.isArray(value) || value.length === 0) return value;

  const rows = value as unknown[];
  const ids = new Set<string>();
  for (const row of rows) {
    const id = (row as { id?: unknown })?.id;
    // Anything without a string id is not a record list — leave it alone.
    if (typeof id !== "string") return value;
    ids.add(id);
  }
  if (ids.size === rows.length) return value;

  console.error(
    `[data] ${label} returned ${rows.length} rows for ${ids.size} distinct ids — de-duplicated`,
  );
  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = (row as { id: string }).id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }) as T;
}

/**
 * The demo value emptied out.
 *
 * Collections become empty, which is what almost every reader here returns and
 * the only shape where inventing content does real damage. Anything else — the
 * organization, the metrics object — has no meaningful empty form, so the demo
 * value stands rather than the page failing on a missing field.
 */
function blank<T>(demoValue: T): T {
  return (Array.isArray(demoValue) ? [] : demoValue) as T;
}

const projectRef = (id: string) => {
  const p = demoProjects.find((x) => x.id === id);
  return { id, name: p?.name ?? "Unknown project" };
};

export async function getOrganization() {
  return withFallback(
    "getOrganization",
    async (db) => {
      const { data } = await db.from("organizations").select("id, name, slug").limit(1).single();
      return data;
    },
    () => DEMO_ORG,
  );
}

export async function getProjects(): Promise<Project[]> {
  return withFallback(
    "getProjects",
    async (db) => {
      const { data } = await db.from("projects").select("*").order("created_at");
      return data as Project[] | null;
    },
    () => demoProjects,
  );
}

export async function getTasks(): Promise<TaskWithProject[]> {
  return withFallback(
    "getTasks",
    async (db) => {
      const { data } = await db
        .from("tasks")
        .select("*, project:projects(id, name)")
        .order("sort_order");
      return data as TaskWithProject[] | null;
    },
    () => demoTasks.map((t) => ({ ...t, project: projectRef(t.project_id) })),
  );
}

export async function getMilestones(): Promise<(Milestone & { project: { id: string; name: string } })[]> {
  return withFallback(
    "getMilestones",
    async (db) => {
      const { data } = await db
        .from("milestones")
        .select("*, project:projects(id, name)")
        .order("starts_at");
      return data as (Milestone & { project: { id: string; name: string } })[] | null;
    },
    () => demoMilestones.map((m) => ({ ...m, project: projectRef(m.project_id) })),
  );
}

export async function getTodayEvents(): Promise<EventWithProject[]> {
  return withFallback(
    "getTodayEvents",
    async (db) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const { data } = await db
        .from("schedule_events")
        .select("*, project:projects(id, name), crew:event_crew(profile:profiles(id, initials, full_name))")
        .gte("scheduled_at", start.toISOString())
        .lt("scheduled_at", end.toISOString())
        .order("scheduled_at");

      if (!data) return null;
      type Row = Omit<EventWithProject, "crew"> & {
        crew: { profile: EventWithProject["crew"][number] }[];
      };
      return (data as unknown as Row[]).map((row) => ({
        ...row,
        crew: row.crew.map((c) => c.profile),
      }));
    },
    () =>
      demoEvents.map((e) => ({
        ...e,
        project: projectRef(e.project_id),
        crew: (demoEventCrew[e.id] ?? [])
          .map((id) => demoProfiles.find((p) => p.id === id))
          .filter((p): p is Profile => Boolean(p))
          .map(({ id, initials, full_name }) => ({ id, initials, full_name })),
      })),
  );
}

export async function getApprovals(): Promise<ApprovalWithProject[]> {
  return withFallback(
    "getApprovals",
    async (db) => {
      const { data } = await db
        .from("approvals")
        .select("*, project:projects(id, name)")
        .eq("status", "pending")
        .order("submitted_at", { ascending: false });
      return data as ApprovalWithProject[] | null;
    },
    () => demoApprovals.map((a) => ({ ...a, project: projectRef(a.project_id) })),
  );
}

export async function getCashFlow(): Promise<CashFlowPoint[]> {
  return withFallback(
    "getCashFlow",
    async (db) => {
      const { data } = await db.from("cash_flow").select("*").order("period");
      return data as CashFlowPoint[] | null;
    },
    () => demoCashFlow,
  );
}

export async function getTeam(): Promise<Profile[]> {
  return withFallback(
    "getTeam",
    async (db) => {
      const { data } = await db.from("profiles").select("*").order("full_name");
      return data as Profile[] | null;
    },
    () => demoProfiles,
  );
}

/**
 * Every document, whichever side of the business it belongs to.
 *
 * A document hangs off a project or off a parcel, never both, so the list has to
 * resolve two different parents into one thing the table can print. `owner` is
 * that: a label and the page it links to. Filing a survey against a parcel that
 * has not become a project yet is the whole point of the parcel side, so those
 * rows cannot simply be dropped from this list.
 */
export async function getDocuments(): Promise<DocumentWithOwner[]> {
  return withFallback(
    "getDocuments",
    async (db) => {
      const { data } = await db
        .from("documents")
        .select("*, project:projects(id, name), property:properties(id, name, address)")
        .order("uploaded_at", { ascending: false });
      return (data as DocumentJoined[] | null)?.map(documentOwner) ?? null;
    },
    () =>
      demoDocuments.map((d) =>
        documentOwner({
          ...d,
          project: d.project_id ? projectRef(d.project_id) : null,
          property: d.property_id
            ? (demoProperties.find((p) => p.id === d.property_id) ?? null)
            : null,
        }),
      ),
  );
}

type DocumentJoined = DocumentRecord & {
  project?: { id: string; name: string } | null;
  property?: { id: string; name: string; address: string | null } | null;
};

export type DocumentWithOwner = DocumentRecord & {
  owner: { kind: "project" | "property"; label: string; href: string } | null;
};

function documentOwner(row: DocumentJoined): DocumentWithOwner {
  const { project, property, ...rest } = row;
  if (project) {
    return {
      ...rest,
      owner: { kind: "project", label: project.name, href: `/projects/${project.id}` },
    };
  }
  if (property) {
    return {
      ...rest,
      owner: {
        kind: "property",
        // The address is the parcel's name now; `name` is the fallback for rows
        // entered before that was true.
        label: property.address || property.name,
        href: `/development/${property.id}`,
      },
    };
  }
  return { ...rest, owner: null };
}

/** Documents filed against a parcel, newest first. */
export async function getPropertyDocuments(propertyId: string): Promise<DocumentRecord[]> {
  return withFallback(
    "getPropertyDocuments",
    async (db) => {
      const { data } = await db
        .from("documents")
        .select("*")
        .eq("property_id", propertyId)
        .order("uploaded_at", { ascending: false });
      return data as DocumentRecord[] | null;
    },
    () => demoDocuments.filter((d) => d.property_id === propertyId),
  );
}

/**
 * What a parcel became, and everything hanging off it.
 *
 * The counts are read rather than the rows, because this section answers "is
 * there anything there" and offers a way through — printing twenty unit numbers
 * on the acquisition record would be a second copy of the construction page.
 */
export async function getPropertyOutcome(propertyId: string): Promise<PropertyOutcome | null> {
  return withFallback(
    "getPropertyOutcome",
    async (db) => {
      const { data: project } = await db
        .from("projects")
        .select("id, name, status, completion_pct")
        .eq("property_id", propertyId)
        .maybeSingle();
      if (!project) return null;

      const p = project as Pick<Project, "id" | "name" | "status" | "completion_pct">;
      const count = async (table: string) =>
        (await db.from(table).select("id", { count: "exact", head: true }).eq("project_id", p.id))
          .count ?? 0;

      const [tasks, contracts, buildings, units] = await Promise.all([
        count("tasks"),
        count("contracts"),
        count("buildings"),
        count("units"),
      ]);

      return { project: p, tasks, contracts, buildings, units };
    },
    () => {
      const project = demoProjects.find((p) => p.property_id === propertyId);
      if (!project) return null;
      return {
        project,
        tasks: demoTasks.filter((t) => t.project_id === project.id).length,
        contracts: demoContracts.filter((c) => c.project_id === project.id).length,
        buildings: demoBuildings.filter((b) => b.project_id === project.id).length,
        units: demoUnits.filter((u) => u.project_id === project.id).length,
      };
    },
  );
}

export type PropertyOutcome = {
  project: Pick<Project, "id" | "name" | "status" | "completion_pct">;
  tasks: number;
  contracts: number;
  buildings: number;
  units: number;
};

export async function getMetrics(): Promise<DashboardMetrics> {
  const db = await createClient();
  if (!db) return demoMetrics;

  try {
    const [projects, tasks, team] = await Promise.all([
      db.from("projects").select("status, budget_spent", { count: "exact" }),
      db.from("tasks").select("overdue", { count: "exact" }),
      db.from("profiles").select("on_site_today", { count: "exact" }),
    ]);

    if (projects.error || tasks.error || team.error) return demoMetrics;

    const revenueYtd = (projects.data ?? []).reduce(
      (sum, p) => sum + Number((p as { budget_spent: number }).budget_spent ?? 0),
      0,
    );

    return {
      revenueYtd,
      revenueDeltaPct: demoMetrics.revenueDeltaPct,
      projectsTotal: projects.count ?? 0,
      projectsActive: (projects.data ?? []).filter(
        (p) => (p as { status: string }).status !== "complete",
      ).length,
      tasksTotal: tasks.count ?? 0,
      tasksOverdue: (tasks.data ?? []).filter((t) => (t as { overdue: boolean }).overdue).length,
      teamTotal: team.count ?? 0,
      teamOnSite: (team.data ?? []).filter((p) => (p as { on_site_today: boolean }).on_site_today)
        .length,
    };
  } catch {
    return demoMetrics;
  }
}

export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

/** Invites that have neither been accepted nor revoked — each holds a seat. */
export async function getPendingInvites(): Promise<PendingInvite[]> {
  const db = await createClient();
  if (!db) return [];

  try {
    const { data } = await db
      .from("org_invites")
      .select("id, email, role, created_at")
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    return (data as PendingInvite[] | null) ?? [];
  } catch {
    return [];
  }
}

/** Signed-in profile, or the demo manager when Supabase is not configured. */
export async function getCurrentProfile(): Promise<Profile> {
  const demoUser = demoProfiles[0]!;
  const db = await createClient();
  if (!db) return demoUser;

  try {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return demoUser;

    const { data } = await db.from("profiles").select("*").eq("id", user.id).single();
    return (data as Profile | null) ?? demoUser;
  } catch {
    return demoUser;
  }
}

/** The date the UI treats as "today" — pinned in demo mode so the seed lines up. */
export async function getToday(): Promise<string> {
  const db = await createClient();
  if (!db) return DEMO_TODAY;
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Development phase                                                   */
/* ------------------------------------------------------------------ */

export async function getProperties(): Promise<Property[]> {
  return (await getPropertiesSourced()).rows;
}

export type PropertySource =
  | { rows: Property[]; demo: false }
  | { rows: Property[]; demo: true; reason: string };

/**
 * Properties, and the truth about where they came from.
 *
 * withFallback discards the error, so a failing query silently serves the
 * bundled sample parcels — which look exactly like data. Someone then drags
 * "Cedar Hollow Tract" to a new column, the update matches no row in their
 * actual database, and the board appears broken when the real problem is that
 * the properties table could not be read at all. This variant keeps the reason
 * so the page can say it.
 */
export async function getPropertiesSourced(): Promise<PropertySource> {
  const db = await createClient();
  if (!db) {
    return { rows: demoProperties, demo: true, reason: "Supabase is not configured." };
  }
  const { data, error } = await db
    .from("properties")
    .select("*")
    .order("identified_at", { ascending: false });
  if (error) return { rows: demoProperties, demo: true, reason: error.message };
  return { rows: (data ?? []) as Property[], demo: false };
}

export async function getProperty(id: string): Promise<Property | null> {
  return withFallback(
    "getProperty",
    async (db) => {
      const { data } = await db.from("properties").select("*").eq("id", id).single();
      return data as Property | null;
    },
    () => demoProperties.find((p) => p.id === id) ?? null,
  );
}

export async function getStudies(propertyId?: string): Promise<FeasibilityStudy[]> {
  return withFallback(
    "getStudies",
    async (db) => {
      let query = db.from("feasibility_studies").select("*").order("kind");
      if (propertyId) query = query.eq("property_id", propertyId);
      const { data } = await query;
      return data as FeasibilityStudy[] | null;
    },
    () => (propertyId ? demoStudies.filter((s) => s.property_id === propertyId) : demoStudies),
  );
}

export async function getConstraints(propertyId?: string): Promise<SiteConstraint[]> {
  return withFallback(
    "getConstraints",
    async (db) => {
      let query = db.from("site_constraints").select("*").order("severity", { ascending: false });
      if (propertyId) query = query.eq("property_id", propertyId);
      const { data } = await query;
      return data as SiteConstraint[] | null;
    },
    () =>
      propertyId ? demoConstraints.filter((c) => c.property_id === propertyId) : demoConstraints,
  );
}

export async function getProFormas(propertyId?: string): Promise<ProForma[]> {
  return withFallback(
    "getProFormas",
    async (db) => {
      let query = db.from("pro_formas").select("*").order("created_at");
      if (propertyId) query = query.eq("property_id", propertyId);
      const { data } = await query;
      return data as ProForma[] | null;
    },
    () => (propertyId ? demoProFormas.filter((p) => p.property_id === propertyId) : demoProFormas),
  );
}

export async function getComparables(propertyId: string): Promise<Comparable[]> {
  return withFallback(
    "getComparables",
    async (db) => {
      const { data } = await db
        .from("comparables")
        .select("*")
        .eq("property_id", propertyId)
        .order("sale_date", { ascending: false });
      return data as Comparable[] | null;
    },
    () => demoComparables.filter((c) => c.property_id === propertyId),
  );
}

export async function getOffers(propertyId?: string): Promise<Offer[]> {
  return withFallback(
    "getOffers",
    async (db) => {
      let query = db.from("offers").select("*").order("offered_at", { ascending: false });
      if (propertyId) query = query.eq("property_id", propertyId);
      const { data } = await query;
      return data as Offer[] | null;
    },
    () => (propertyId ? demoOffers.filter((o) => o.property_id === propertyId) : demoOffers),
  );
}

/* ------------------------------------------------------------------ */
/* Construction phase                                                  */
/* ------------------------------------------------------------------ */

export async function getSubcontractors(): Promise<Subcontractor[]> {
  return withFallback(
    "getSubcontractors",
    async (db) => {
      const { data } = await db.from("subcontractors").select("*").order("company_name");
      return data as Subcontractor[] | null;
    },
    () => demoSubcontractors,
  );
}

export async function getBidPackages(): Promise<BidPackageWithQuotes[]> {
  return withFallback(
    "getBidPackages",
    async (db) => {
      const { data } = await db
        .from("bid_packages")
        .select("*, project:projects(id, name), quotes(*, subcontractor:subcontractors(id, company_name, rating))")
        .order("due_at");
      return data as BidPackageWithQuotes[] | null;
    },
    () =>
      demoBidPackages.map((pkg) => ({
        ...pkg,
        project: projectRef(pkg.project_id),
        quotes: demoQuotes
          .filter((q) => q.bid_package_id === pkg.id)
          .map((q) => ({
            ...q,
            subcontractor: (() => {
              const sub = demoSubcontractors.find((s) => s.id === q.subcontractor_id);
              return {
                id: q.subcontractor_id,
                company_name: sub?.company_name ?? "Unknown",
                rating: sub?.rating ?? null,
              };
            })(),
          })),
      })),
  );
}

export async function getContracts(): Promise<ContractWithParties[]> {
  return withFallback(
    "getContracts",
    async (db) => {
      const { data } = await db
        .from("contracts")
        .select("*, subcontractor:subcontractors(id, company_name), project:projects(id, name)")
        .order("contract_number");
      if (!data) return null;

      // The view carries the change-order arithmetic, so the page never has to
      // recompute what a contract is currently worth.
      const { data: totals } = await db.from("contract_totals").select("*");
      const byId = new Map(
        ((totals as ContractTotal[] | null) ?? []).map((t) => [t.contract_id, t]),
      );
      return (data as ContractWithParties[]).map((c) => ({
        ...c,
        totals: byId.get(c.id) ?? null,
      }));
    },
    () =>
      demoContracts.map((contract) => {
        const sub = demoSubcontractors.find((s) => s.id === contract.subcontractor_id);
        return {
          ...contract,
          subcontractor: {
            id: contract.subcontractor_id,
            company_name: sub?.company_name ?? "Unknown",
          },
          project: projectRef(contract.project_id),
          totals: demoContractTotals.find((t) => t.contract_id === contract.id) ?? null,
        };
      }),
  );
}

export async function getChangeOrders(): Promise<ChangeOrderWithContract[]> {
  return withFallback(
    "getChangeOrders",
    async (db) => {
      const { data } = await db
        .from("change_orders")
        .select("*, contract:contracts(id, contract_number, title), project:projects(id, name)")
        .order("submitted_at", { ascending: false });
      return data as ChangeOrderWithContract[] | null;
    },
    () =>
      demoChangeOrders.map((co) => {
        const contract = demoContracts.find((c) => c.id === co.contract_id);
        return {
          ...co,
          contract: {
            id: co.contract_id,
            contract_number: contract?.contract_number ?? "—",
            title: contract?.title ?? "Unknown contract",
          },
          project: projectRef(co.project_id),
        };
      }),
  );
}
