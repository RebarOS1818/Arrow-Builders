export type ProjectStatus = "on_schedule" | "behind_schedule" | "at_risk" | "complete";

export type TaskStatus = "unscheduled" | "scheduled" | "in_progress" | "blocked" | "done";

export type Trade = "general" | "concrete" | "electrical" | "plumbing" | "finishes";

export type ApprovalKind = "change_order" | "payment_application" | "submittal" | "rfq" | "rfi";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type Organization = {
  id: string;
  name: string;
  slug: string;
};

export type Profile = {
  id: string;
  org_id: string | null;
  full_name: string;
  initials: string;
  role: string;
  trade: Trade | null;
  avatar_url: string | null;
  on_site_today: boolean;
};

export type Project = {
  id: string;
  org_id: string;
  name: string;
  city: string;
  state: string;
  status: ProjectStatus;
  completion_pct: number;
  budget_spent: number;
  budget_total: number;
  target_date: string; // ISO date
  cover_url: string | null;
};

export type Task = {
  id: string;
  org_id: string;
  project_id: string;
  title: string;
  trade: Trade;
  status: TaskStatus;
  starts_at: string | null; // ISO date
  ends_at: string | null; // ISO date
  crew_size: number;
  overdue: boolean;
  sort_order: number;
};

export type Milestone = {
  id: string;
  org_id: string;
  project_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  trade: Trade;
};

export type ScheduleEvent = {
  id: string;
  org_id: string;
  project_id: string;
  title: string;
  scheduled_at: string; // ISO timestamp
  crew_size: number;
};

export type Approval = {
  id: string;
  org_id: string;
  project_id: string;
  kind: ApprovalKind;
  reference: string;
  amount: number | null;
  status: ApprovalStatus;
  submitted_at: string;
};

export type CashFlowPoint = {
  id: string;
  org_id: string;
  period: string; // ISO date, start of period
  inflow: number;
  outflow: number;
};

export type DocumentRecord = {
  id: string;
  org_id: string;
  project_id: string;
  name: string;
  category: string;
  size_kb: number;
  uploaded_at: string;
  uploaded_by: string;
};

/** Denormalized shapes used by the UI. */
export type TaskWithProject = Task & { project: Pick<Project, "id" | "name"> };
export type ApprovalWithProject = Approval & { project: Pick<Project, "id" | "name"> };
export type EventWithProject = ScheduleEvent & {
  project: Pick<Project, "id" | "name">;
  crew: Pick<Profile, "id" | "initials" | "full_name">[];
};

export type DashboardMetrics = {
  revenueYtd: number;
  revenueDeltaPct: number;
  projectsTotal: number;
  projectsActive: number;
  tasksTotal: number;
  tasksOverdue: number;
  teamTotal: number;
  teamOnSite: number;
};
