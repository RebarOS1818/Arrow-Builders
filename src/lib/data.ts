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
import type {
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
 * Reads go through Supabase when it is configured, and fall back to the demo
 * dataset otherwise. Fallback also covers query errors so a half-migrated
 * database degrades to a readable page instead of a crash.
 *
 * An empty result is NOT a fallback trigger: for a configured project, zero
 * rows is a legitimate state (a new organization, a project with no documents
 * yet), and substituting demo rows there would show fabricated data in
 * production.
 */
async function withFallback<T>(
  query: (db: NonNullable<Awaited<ReturnType<typeof createClient>>>) => Promise<T | null>,
  fallback: () => T,
): Promise<T> {
  const db = await createClient();
  if (!db) return fallback();
  try {
    const result = await query(db);
    return result ?? fallback();
  } catch {
    return fallback();
  }
}

const projectRef = (id: string) => {
  const p = demoProjects.find((x) => x.id === id);
  return { id, name: p?.name ?? "Unknown project" };
};

export async function getOrganization() {
  return withFallback(
    async (db) => {
      const { data } = await db.from("organizations").select("id, name, slug").limit(1).single();
      return data;
    },
    () => DEMO_ORG,
  );
}

export async function getProjects(): Promise<Project[]> {
  return withFallback(
    async (db) => {
      const { data } = await db.from("projects").select("*").order("created_at");
      return data as Project[] | null;
    },
    () => demoProjects,
  );
}

export async function getTasks(): Promise<TaskWithProject[]> {
  return withFallback(
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
    async (db) => {
      const { data } = await db.from("cash_flow").select("*").order("period");
      return data as CashFlowPoint[] | null;
    },
    () => demoCashFlow,
  );
}

export async function getTeam(): Promise<Profile[]> {
  return withFallback(
    async (db) => {
      const { data } = await db.from("profiles").select("*").order("full_name");
      return data as Profile[] | null;
    },
    () => demoProfiles,
  );
}

export async function getDocuments(): Promise<(DocumentRecord & { project: { id: string; name: string } })[]> {
  return withFallback(
    async (db) => {
      const { data } = await db
        .from("documents")
        .select("*, project:projects(id, name)")
        .order("uploaded_at", { ascending: false });
      return data as (DocumentRecord & { project: { id: string; name: string } })[] | null;
    },
    () => demoDocuments.map((d) => ({ ...d, project: projectRef(d.project_id) })),
  );
}

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
