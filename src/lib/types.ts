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
  is_admin: boolean;
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
  /** The parcel this was built on, once the development phase produced one. */
  property_id: string | null;
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
  /**
   * Optionally narrows the task to one building inside its own project. The
   * database refuses a building on any other project.
   */
  building_id: string | null;
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
  /** Exactly one of these is set. A document belongs to a project or a parcel. */
  project_id: string | null;
  property_id: string | null;
  /**
   * Narrows a project document to one building. Never set on a parcel document
   * — a building document is a project document that also names the building,
   * not a fourth kind of owner.
   */
  building_id: string | null;
  name: string;
  category: string;
  size_kb: number;
  /** Null for records that predate storage, and for the demo dataset. */
  storage_path: string | null;
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

/* ------------------------------------------------------------------ */
/* Development phase                                                   */
/* ------------------------------------------------------------------ */

/**
 * The acquisition pipeline, in order. The order is the process, and the board
 * renders columns straight from it — a stage in the wrong place here is a
 * pipeline that reads wrong on screen.
 */
export type PropertyStatus =
  | "prospecting"
  | "pre_planning"
  | "planning"
  | "under_contract"
  | "owned_predevelopment"
  | "in_development"
  | "units_listed"
  | "partially_sold"
  | "sold_out"
  | "passed";

/** Single-family or multi-family. Free text in the database so a third kind
 *  does not need a migration to exist. */
export type PropertyType = "single_family_lot" | "multi_family_lot";

export type StudyKind =
  | "zoning"
  | "environmental"
  | "geotechnical"
  | "utilities"
  | "traffic"
  | "title"
  | "survey"
  | "floodplain";

export type StudyStatus = "not_started" | "in_progress" | "complete" | "blocked";
export type StudyVerdict = "favorable" | "conditional" | "unfavorable";
export type ConstraintSeverity = "informational" | "minor" | "major" | "fatal";
export type OfferStatus =
  | "draft"
  | "submitted"
  | "countered"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired";
export type ProFormaStatus = "draft" | "under_review" | "approved" | "rejected";

export type Property = {
  id: string;
  org_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  /** APN — the assessor's parcel number. */
  parcel_number: string | null;
  lot_size_acres: number | null;
  /** As quoted. Not derived from acres, and neither derives the other. */
  lot_size_sqft: number | null;
  zoning_code: string | null;
  asking_price: number | null;
  property_type: string | null;
  total_units_planned: number | null;
  acquisition_date: string | null;
  /** Budgeted construction cost, as against asking_price for acquisition. */
  hard_cost_budget: number | null;
  broker: string | null;
  owner_name: string | null;
  architect: string | null;
  status: PropertyStatus;
  notes: string;
  identified_at: string;
  /** Null unless the address was chosen from autocomplete. */
  latitude: number | null;
  longitude: number | null;
};

export type FeasibilityStudy = {
  id: string;
  property_id: string;
  kind: StudyKind;
  status: StudyStatus;
  verdict: StudyVerdict | null;
  findings: string;
  cost: number | null;
  consultant: string;
  completed_at: string | null;
};

export type SiteConstraint = {
  id: string;
  property_id: string;
  kind: string;
  severity: ConstraintSeverity;
  description: string;
  affects_buildable_area: boolean;
  resolved: boolean;
};

export type ProForma = {
  id: string;
  property_id: string;
  scenario: string;
  status: ProFormaStatus;
  planned_units: number;
  planned_sqft: number;
  acquisition_cost: number;
  hard_costs: number;
  soft_costs: number;
  financing_costs: number;
  contingency_pct: number;
  projected_revenue: number;
  target_margin_pct: number;
  /** Generated in the database, so it can never drift from its inputs. */
  total_cost: number;
  projected_profit: number;
};

export type Comparable = {
  id: string;
  property_id: string;
  address: string;
  sale_price: number | null;
  sale_date: string | null;
  building_sqft: number | null;
  lot_size_acres: number | null;
  distance_miles: number | null;
  price_per_sqft: number | null;
  latitude: number | null;
  longitude: number | null;
};

export type Offer = {
  id: string;
  property_id: string;
  amount: number;
  status: OfferStatus;
  offered_at: string;
  expires_at: string | null;
  earnest_money: number | null;
  due_diligence_days: number | null;
  notes: string;
};

/* ------------------------------------------------------------------ */
/* Construction phase                                                  */
/* ------------------------------------------------------------------ */

export type BuildingType =
  | "single_family"
  | "townhome"
  | "multifamily"
  | "commercial"
  | "mixed_use"
  | "amenity";

export type BuildStatus =
  | "planned"
  | "permitting"
  | "under_construction"
  | "complete"
  | "on_hold";

export type UnitStatus =
  | "planned"
  | "under_construction"
  | "complete"
  | "reserved"
  | "sold"
  | "leased";

export type BidStatus = "draft" | "open" | "closed" | "awarded" | "cancelled";
export type QuoteStatus =
  | "received"
  | "shortlisted"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired";
export type ContractStatus =
  | "draft"
  | "sent"
  | "executed"
  | "in_progress"
  | "complete"
  | "terminated";
export type ChangeOrderStatus = "draft" | "submitted" | "approved" | "rejected" | "void";
export type ChangeOrderReason =
  | "owner_request"
  | "unforeseen_condition"
  | "design_error"
  | "code_requirement"
  | "weather"
  | "material_availability"
  | "other";

export type Building = {
  id: string;
  project_id: string;
  /**
   * The parcel it stands on.
   *
   * A building already reaches a parcel through its project, but only when the
   * project has one — and a project assembled from several parcels has no single
   * answer. This is the only place it is unambiguous.
   */
  property_id: string | null;
  /** Who is running it. Null once that person leaves. */
  manager_id: string | null;
  name: string;
  building_type: BuildingType;
  status: BuildStatus;
  floors: number;
  gross_sqft: number | null;
  permit_number: string | null;
  permit_issued_at: string | null;
  completed_at: string | null;
};

/** Counted from the units rather than stored, so the two cannot disagree. */
export type BuildingTotals = {
  unit_count: number;
  units_sold: number;
  sales_revenue: number;
  unsold_list_value: number;
};

export type BuildingWithTotals = Building & {
  totals: BuildingTotals | null;
  units: Unit[];
  /** Project documents filed against this building. */
  documents: DocumentRecord[];
};

export type Unit = {
  id: string;
  building_id: string;
  project_id: string;
  unit_number: string;
  unit_type: string;
  status: UnitStatus;
  floor: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  list_price: number | null;
  /** What it actually closed for. Only meaningful once the status is sold. */
  sold_price: number | null;
  closed_at: string | null;
};

export type Subcontractor = {
  id: string;
  company_name: string;
  trade: Trade;
  contact_name: string;
  email: string;
  phone: string;
  license_number: string | null;
  insurance_expires_at: string | null;
  is_approved: boolean;
  rating: number | null;
};

export type BidPackage = {
  id: string;
  project_id: string;
  name: string;
  trade: Trade;
  scope_description: string;
  budget: number | null;
  status: BidStatus;
  due_at: string | null;
};

export type Quote = {
  id: string;
  bid_package_id: string;
  subcontractor_id: string;
  amount: number;
  status: QuoteStatus;
  duration_days: number | null;
  submitted_at: string;
  exclusions: string;
};

export type Contract = {
  id: string;
  project_id: string;
  subcontractor_id: string;
  contract_number: string;
  title: string;
  trade: Trade;
  original_amount: number;
  status: ContractStatus;
  retainage_pct: number;
  starts_on: string | null;
  ends_on: string | null;
};

export type ChangeOrder = {
  id: string;
  contract_id: string;
  project_id: string;
  number: number;
  description: string;
  reason: ChangeOrderReason;
  amount: number;
  days_impact: number;
  status: ChangeOrderStatus;
  submitted_at: string | null;
};

/** From the contract_totals view: original plus approved change orders. */
export type ContractTotal = {
  contract_id: string;
  original_amount: number;
  approved_changes: number;
  pending_changes: number;
  current_amount: number;
  approved_days_impact: number;
};

/** Denormalised shapes the UI needs. */
export type PropertyWithSummary = Property & {
  studies: FeasibilityStudy[];
  constraints: SiteConstraint[];
  proFormas: ProForma[];
};

export type ContractWithParties = Contract & {
  subcontractor: Pick<Subcontractor, "id" | "company_name">;
  project: Pick<Project, "id" | "name">;
  totals: ContractTotal | null;
};

export type QuoteWithSub = Quote & {
  subcontractor: Pick<Subcontractor, "id" | "company_name" | "rating">;
};

export type BidPackageWithQuotes = BidPackage & {
  project: Pick<Project, "id" | "name">;
  quotes: QuoteWithSub[];
};

export type ChangeOrderWithContract = ChangeOrder & {
  contract: Pick<Contract, "id" | "contract_number" | "title">;
  project: Pick<Project, "id" | "name">;
};
