import type {
  Approval,
  CashFlowPoint,
  DocumentRecord,
  Milestone,
  Profile,
  Project,
  ScheduleEvent,
  Task,
} from "./types";

/**
 * The demo dataset is anchored to Friday, May 16 2025 so the seeded schedule,
 * cash-flow window and "today on site" list always line up with each other.
 */
export const DEMO_TODAY = "2025-05-16";

export const DEMO_ORG = { id: "org-greenfield", name: "Greenfield Construction", slug: "greenfield" };

export const demoProfiles: Profile[] = [
  { id: "u-jordan", org_id: DEMO_ORG.id, full_name: "Jordan Mills", initials: "JM", role: "Development Manager", trade: null, avatar_url: null, on_site_today: false },
  { id: "u-alicia", org_id: DEMO_ORG.id, full_name: "Alicia Reyes", initials: "AR", role: "Superintendent", trade: "concrete", avatar_url: null, on_site_today: true },
  { id: "u-marcus", org_id: DEMO_ORG.id, full_name: "Marcus Webb", initials: "MW", role: "Project Engineer", trade: "general", avatar_url: null, on_site_today: true },
  { id: "u-priya", org_id: DEMO_ORG.id, full_name: "Priya Nair", initials: "PN", role: "Estimator", trade: null, avatar_url: null, on_site_today: false },
  { id: "u-devon", org_id: DEMO_ORG.id, full_name: "Devon Clarke", initials: "DC", role: "Foreman", trade: "electrical", avatar_url: null, on_site_today: true },
  { id: "u-sofia", org_id: DEMO_ORG.id, full_name: "Sofia Ibarra", initials: "SI", role: "Safety Lead", trade: null, avatar_url: null, on_site_today: true },
  { id: "u-glenn", org_id: DEMO_ORG.id, full_name: "Glenn Portis", initials: "GP", role: "Plumbing Lead", trade: "plumbing", avatar_url: null, on_site_today: false },
  { id: "u-hana", org_id: DEMO_ORG.id, full_name: "Hana Osei", initials: "HO", role: "Finishes Lead", trade: "finishes", avatar_url: null, on_site_today: false },
];

export const demoProjects: Project[] = [
  {
    id: "p-riverside",
    org_id: DEMO_ORG.id,
    name: "Riverside Apartments",
    city: "Austin",
    state: "TX",
    status: "on_schedule",
    completion_pct: 68,
    budget_spent: 2_340_000,
    budget_total: 3_450_000,
    target_date: "2025-08-22",
    cover_url: null,
  },
  {
    id: "p-maple",
    org_id: DEMO_ORG.id,
    name: "Maple Street Townhomes",
    city: "Round Rock",
    state: "TX",
    status: "behind_schedule",
    completion_pct: 42,
    budget_spent: 1_150_000,
    budget_total: 2_750_000,
    target_date: "2025-10-10",
    cover_url: null,
  },
  {
    id: "p-westgate",
    org_id: DEMO_ORG.id,
    name: "Westgate Retail Center",
    city: "Pflugerville",
    state: "TX",
    status: "on_schedule",
    completion_pct: 25,
    budget_spent: 880_000,
    budget_total: 3_200_000,
    target_date: "2025-12-18",
    cover_url: null,
  },
];

let order = 0;
const task = (t: Omit<Task, "org_id" | "sort_order" | "overdue"> & { overdue?: boolean }): Task => ({
  org_id: DEMO_ORG.id,
  sort_order: order++,
  overdue: false,
  ...t,
});

export const demoTasks: Task[] = [
  // Unscheduled backlog — the left rail of the schedule board.
  task({ id: "t-doors", project_id: "p-westgate", title: "Install Exterior Doors", trade: "general", status: "unscheduled", starts_at: null, ends_at: null, crew_size: 2 }),
  task({ id: "t-paint2", project_id: "p-riverside", title: "Paint – Level 2", trade: "finishes", status: "unscheduled", starts_at: null, ends_at: null, crew_size: 3 }),
  task({ id: "t-landscape", project_id: "p-maple", title: "Landscape Prep", trade: "general", status: "unscheduled", starts_at: null, ends_at: null, crew_size: 2 }),
  task({ id: "t-plumbing", project_id: "p-riverside", title: "Plumbing Rough-In", trade: "plumbing", status: "unscheduled", starts_at: null, ends_at: null, crew_size: 2 }),
  task({ id: "t-clean", project_id: "p-westgate", title: "Final Clean", trade: "finishes", status: "unscheduled", starts_at: null, ends_at: null, crew_size: 4 }),
  task({ id: "t-fire", project_id: "p-westgate", title: "Fire Sprinkler Trim", trade: "plumbing", status: "unscheduled", starts_at: null, ends_at: null, crew_size: 3 }),
  task({ id: "t-punch", project_id: "p-riverside", title: "Punch List Walk", trade: "general", status: "unscheduled", starts_at: null, ends_at: null, crew_size: 2 }),
  task({ id: "t-elevator", project_id: "p-riverside", title: "Elevator Inspection", trade: "general", status: "unscheduled", starts_at: null, ends_at: null, crew_size: 1 }),
  task({ id: "t-gutters", project_id: "p-maple", title: "Gutters & Downspouts", trade: "general", status: "unscheduled", starts_at: null, ends_at: null, crew_size: 2 }),
  task({ id: "t-panel", project_id: "p-westgate", title: "Panel Board Install", trade: "electrical", status: "unscheduled", starts_at: null, ends_at: null, crew_size: 3 }),
  task({ id: "t-tile", project_id: "p-maple", title: "Tile – Units 4-8", trade: "finishes", status: "unscheduled", starts_at: null, ends_at: null, crew_size: 4 }),
  task({ id: "t-striping", project_id: "p-westgate", title: "Parking Lot Striping", trade: "general", status: "unscheduled", starts_at: null, ends_at: null, crew_size: 2 }),
  task({ id: "t-hvac", project_id: "p-riverside", title: "HVAC Startup", trade: "electrical", status: "unscheduled", starts_at: null, ends_at: null, crew_size: 3 }),

  // Scheduled — week of May 12–18 2025.
  task({ id: "t-siteprep", project_id: "p-riverside", title: "Site Prep", trade: "general", status: "done", starts_at: "2025-05-12", ends_at: "2025-05-12", crew_size: 4 }),
  task({ id: "t-footings", project_id: "p-maple", title: "Footings", trade: "concrete", status: "done", starts_at: "2025-05-12", ends_at: "2025-05-12", crew_size: 5 }),
  task({ id: "t-framing1", project_id: "p-westgate", title: "Framing – Level 1", trade: "general", status: "in_progress", starts_at: "2025-05-13", ends_at: "2025-05-13", crew_size: 6 }),
  task({ id: "t-pour", project_id: "p-maple", title: "Concrete Pour", trade: "concrete", status: "in_progress", starts_at: "2025-05-15", ends_at: "2025-05-15", crew_size: 6, overdue: true }),
  task({ id: "t-drywall", project_id: "p-riverside", title: "Drywall – Level 2", trade: "finishes", status: "scheduled", starts_at: "2025-05-14", ends_at: "2025-05-14", crew_size: 4 }),
  task({ id: "t-windows", project_id: "p-westgate", title: "Window Install", trade: "general", status: "scheduled", starts_at: "2025-05-16", ends_at: "2025-05-16", crew_size: 4 }),
  task({ id: "t-roofing", project_id: "p-riverside", title: "Roofing", trade: "general", status: "scheduled", starts_at: "2025-05-17", ends_at: "2025-05-17", crew_size: 5 }),
  task({ id: "t-intpaint", project_id: "p-maple", title: "Interior Paint", trade: "finishes", status: "scheduled", starts_at: "2025-05-18", ends_at: "2025-05-18", crew_size: 4 }),
];

export const demoMilestones: Milestone[] = [
  { id: "m-foundations", org_id: DEMO_ORG.id, project_id: "p-maple", title: "Concrete Foundations", trade: "concrete", starts_at: "2025-05-12", ends_at: "2025-05-16" },
  { id: "m-steel", org_id: DEMO_ORG.id, project_id: "p-westgate", title: "Steel Erection", trade: "general", starts_at: "2025-05-15", ends_at: "2025-05-22" },
];

export const demoEvents: ScheduleEvent[] = [
  { id: "e-walk", org_id: DEMO_ORG.id, project_id: "p-riverside", title: "Site Walk", scheduled_at: "2025-05-16T06:30:00-05:00", crew_size: 5 },
  { id: "e-pour", org_id: DEMO_ORG.id, project_id: "p-maple", title: "Concrete Pour", scheduled_at: "2025-05-16T08:00:00-05:00", crew_size: 7 },
  { id: "e-framing", org_id: DEMO_ORG.id, project_id: "p-westgate", title: "Framing Inspection", scheduled_at: "2025-05-16T10:00:00-05:00", crew_size: 4 },
  { id: "e-mep", org_id: DEMO_ORG.id, project_id: "p-riverside", title: "MEP Rough-In", scheduled_at: "2025-05-16T13:00:00-05:00", crew_size: 4 },
];

export const demoEventCrew: Record<string, string[]> = {
  "e-walk": ["u-alicia", "u-marcus", "u-sofia"],
  "e-pour": ["u-alicia", "u-devon", "u-marcus", "u-sofia"],
  "e-framing": ["u-marcus", "u-devon", "u-sofia"],
  "e-mep": ["u-devon", "u-glenn", "u-marcus", "u-hana"],
};

export const demoApprovals: Approval[] = [
  { id: "a-co12", org_id: DEMO_ORG.id, project_id: "p-riverside", kind: "change_order", reference: "Change Order #12", amount: 18_650, status: "pending", submitted_at: "2025-05-16T09:10:00-05:00" },
  { id: "a-pay4", org_id: DEMO_ORG.id, project_id: "p-maple", kind: "payment_application", reference: "Payment Application #4", amount: 76_320, status: "pending", submitted_at: "2025-05-15T15:40:00-05:00" },
  { id: "a-sub", org_id: DEMO_ORG.id, project_id: "p-westgate", kind: "submittal", reference: "Submittal: Window Frames", amount: null, status: "pending", submitted_at: "2025-05-14T11:05:00-05:00" },
  { id: "a-rfq", org_id: DEMO_ORG.id, project_id: "p-riverside", kind: "rfq", reference: "RFQ: Electrical Fixtures", amount: null, status: "pending", submitted_at: "2025-05-13T08:20:00-05:00" },
  { id: "a-rfi", org_id: DEMO_ORG.id, project_id: "p-maple", kind: "rfi", reference: "RFI: Slab Edge Detail", amount: null, status: "pending", submitted_at: "2025-05-12T16:00:00-05:00" },
];

/** Bi-weekly buckets covering the 90 days after DEMO_TODAY. */
export const demoCashFlow: CashFlowPoint[] = [
  { id: "cf-1", org_id: DEMO_ORG.id, period: "2025-05-16", inflow: 210_000, outflow: 148_000 },
  { id: "cf-2", org_id: DEMO_ORG.id, period: "2025-05-30", inflow: 168_000, outflow: 132_000 },
  { id: "cf-3", org_id: DEMO_ORG.id, period: "2025-06-13", inflow: 254_000, outflow: 196_000 },
  { id: "cf-4", org_id: DEMO_ORG.id, period: "2025-06-27", inflow: 142_000, outflow: 178_000 },
  { id: "cf-5", org_id: DEMO_ORG.id, period: "2025-07-11", inflow: 288_000, outflow: 164_000 },
  { id: "cf-6", org_id: DEMO_ORG.id, period: "2025-07-25", inflow: 196_000, outflow: 210_000 },
  { id: "cf-7", org_id: DEMO_ORG.id, period: "2025-08-08", inflow: 232_000, outflow: 158_000 },
];

export const demoDocuments: DocumentRecord[] = [
  { id: "d-1", org_id: DEMO_ORG.id, project_id: "p-riverside", name: "Riverside – Structural Set Rev C.pdf", category: "Drawings", size_kb: 18_420, uploaded_at: "2025-05-15T14:00:00-05:00", uploaded_by: "Marcus Webb" },
  { id: "d-2", org_id: DEMO_ORG.id, project_id: "p-maple", name: "Foundation Pour Log 05-15.xlsx", category: "Field Reports", size_kb: 240, uploaded_at: "2025-05-15T18:30:00-05:00", uploaded_by: "Alicia Reyes" },
  { id: "d-3", org_id: DEMO_ORG.id, project_id: "p-westgate", name: "Window Frame Submittal.pdf", category: "Submittals", size_kb: 6_180, uploaded_at: "2025-05-14T11:05:00-05:00", uploaded_by: "Priya Nair" },
  { id: "d-4", org_id: DEMO_ORG.id, project_id: "p-riverside", name: "Change Order 12 – Signed.pdf", category: "Contracts", size_kb: 890, uploaded_at: "2025-05-16T09:10:00-05:00", uploaded_by: "Jordan Mills" },
  { id: "d-5", org_id: DEMO_ORG.id, project_id: "p-maple", name: "Site Safety Plan 2025.docx", category: "Safety", size_kb: 1_320, uploaded_at: "2025-05-09T08:00:00-05:00", uploaded_by: "Sofia Ibarra" },
  { id: "d-6", org_id: DEMO_ORG.id, project_id: "p-westgate", name: "Steel Erection Sequence.pdf", category: "Drawings", size_kb: 9_640, uploaded_at: "2025-05-12T10:45:00-05:00", uploaded_by: "Marcus Webb" },
];

/** Headline numbers are portfolio-wide and include projects outside the demo detail set. */
export const demoMetrics = {
  revenueYtd: 2_480_000,
  revenueDeltaPct: 18,
  projectsTotal: 12,
  projectsActive: 5,
  tasksTotal: 86,
  tasksOverdue: 28,
  teamTotal: 32,
  teamOnSite: 4,
};

export const demoWeather = [
  { date: "2025-05-12", high: 74, low: 52, condition: "sunny" as const },
  { date: "2025-05-13", high: 76, low: 54, condition: "partly" as const },
  { date: "2025-05-14", high: 71, low: 53, condition: "cloudy" as const },
  { date: "2025-05-15", high: 73, low: 55, condition: "partly" as const },
  { date: "2025-05-16", high: 72, low: 54, condition: "sunny" as const },
  { date: "2025-05-17", high: 75, low: 55, condition: "sunny" as const },
  { date: "2025-05-18", high: 70, low: 53, condition: "cloudy" as const },
];
