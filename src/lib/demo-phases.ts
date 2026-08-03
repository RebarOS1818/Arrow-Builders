import { DEMO_ORG, demoProjects } from "./demo-data";
import type {
  BidPackage,
  Building,
  ChangeOrder,
  Comparable,
  Contract,
  ContractTotal,
  FeasibilityStudy,
  Offer,
  ProForma,
  Property,
  Quote,
  SiteConstraint,
  Subcontractor,
  Unit,
} from "./types";

/**
 * Demo rows for the development and construction phases, so both sections
 * render before the client's database has anything in it.
 *
 * Deliberately not all-green: a parcel with a fatal constraint, a study that
 * came back unfavourable, a contract carrying change orders, an expiring
 * insurance certificate. A demo where everything is fine shows nothing about
 * whether the interface communicates when things are not.
 */

const ORG = DEMO_ORG.id;

/**
 * Dates that stay meaningful.
 *
 * Fixed demo dates rot: written in 2025, every insurance certificate reads as
 * expired a year later, and a warning that fires on every row is one nobody
 * reads. Expressing them relative to today keeps the demo showing what it is
 * meant to show — one lapsed, one about to, the rest fine.
 */
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const demoProperties: Property[] = [
  {
    id: "prop-cedar",
    org_id: ORG,
    name: "Cedar Hollow Tract",
    address: "4200 Cedar Hollow Rd",
    city: "Leander",
    state: "TX",
    parcel_number: "R-114523",
    lot_size_acres: 12.4,
    zoning_code: "SF-2",
    asking_price: 2_150_000,
    status: "under_review",
    notes: "Seller motivated; wants a 30-day close.",
    identified_at: "2025-04-02", latitude: null, longitude: null,
  },
  {
    id: "prop-mill",
    org_id: ORG,
    name: "Mill Creek Parcel",
    address: "88 Mill Creek Way",
    city: "Georgetown",
    state: "TX",
    parcel_number: "R-220981",
    lot_size_acres: 5.1,
    zoning_code: "MF-1",
    asking_price: 1_400_000,
    status: "under_contract",
    notes: "Feasibility period ends Aug 14.",
    identified_at: "2025-03-11", latitude: null, longitude: null,
  },
  {
    id: "prop-quarry",
    org_id: ORG,
    name: "Quarry Ridge",
    address: "1500 Quarry Ridge",
    city: "Liberty Hill",
    state: "TX",
    parcel_number: "R-330447",
    lot_size_acres: 22.0,
    zoning_code: "AG",
    asking_price: 3_600_000,
    status: "passed",
    notes: "Passed: floodplain takes a third of the buildable area.",
    identified_at: "2025-02-20", latitude: null, longitude: null,
  },
  {
    id: "prop-oak",
    org_id: ORG,
    name: "Oakline Assemblage",
    address: "Oakline & 3rd",
    city: "Round Rock",
    state: "TX",
    parcel_number: null,
    lot_size_acres: 3.8,
    zoning_code: "C-1",
    asking_price: 980_000,
    status: "prospect",
    notes: "Three adjacent lots; two owners approached so far.",
    identified_at: "2025-05-06", latitude: null, longitude: null,
  },
];

export const demoStudies: FeasibilityStudy[] = [
  { id: "fs-1", property_id: "prop-cedar", kind: "zoning", status: "complete", verdict: "favorable", findings: "SF-2 permits 4.2 units/acre by right.", cost: 4500, consultant: "Lantana Planning", completed_at: "2025-04-18" },
  { id: "fs-2", property_id: "prop-cedar", kind: "geotechnical", status: "complete", verdict: "conditional", findings: "Expansive clay across the north third; piers required.", cost: 12000, consultant: "TerraCore", completed_at: "2025-05-02" },
  { id: "fs-3", property_id: "prop-cedar", kind: "utilities", status: "in_progress", verdict: null, findings: "", cost: 6800, consultant: "Hill Country Civil", completed_at: null },
  { id: "fs-4", property_id: "prop-cedar", kind: "title", status: "not_started", verdict: null, findings: "", cost: null, consultant: "", completed_at: null },
  { id: "fs-5", property_id: "prop-mill", kind: "zoning", status: "complete", verdict: "favorable", findings: "MF-1 supports 36 units at current setbacks.", cost: 4500, consultant: "Lantana Planning", completed_at: "2025-03-28" },
  { id: "fs-6", property_id: "prop-mill", kind: "environmental", status: "complete", verdict: "favorable", findings: "Phase I clear, no recognised conditions.", cost: 3200, consultant: "Verdant ESA", completed_at: "2025-04-09" },
  { id: "fs-7", property_id: "prop-quarry", kind: "floodplain", status: "complete", verdict: "unfavorable", findings: "7.3 acres in the 100-year floodplain.", cost: 5100, consultant: "Hill Country Civil", completed_at: "2025-03-05" },
];

export const demoConstraints: SiteConstraint[] = [
  { id: "sc-1", property_id: "prop-cedar", kind: "Drainage easement", severity: "minor", description: "20ft easement along the eastern boundary.", affects_buildable_area: true, resolved: false },
  { id: "sc-2", property_id: "prop-cedar", kind: "Heritage oaks", severity: "major", description: "Four protected oaks; city review needed before removal.", affects_buildable_area: true, resolved: false },
  { id: "sc-3", property_id: "prop-mill", kind: "Utility crossing", severity: "informational", description: "Existing sewer stub at the north-west corner.", affects_buildable_area: false, resolved: true },
  { id: "sc-4", property_id: "prop-quarry", kind: "Floodplain", severity: "fatal", description: "A third of the site is unbuildable.", affects_buildable_area: true, resolved: false },
];

export const demoProFormas: ProForma[] = [
  { id: "pf-1", property_id: "prop-cedar", scenario: "Base case — 48 units", status: "under_review", planned_units: 48, planned_sqft: 96000, acquisition_cost: 2_150_000, hard_costs: 9_600_000, soft_costs: 1_450_000, financing_costs: 620_000, contingency_pct: 8, projected_revenue: 16_800_000, target_margin_pct: 18, total_cost: 14_708_000, projected_profit: 2_092_000 },
  { id: "pf-2", property_id: "prop-cedar", scenario: "Downside — 40 units", status: "draft", planned_units: 40, planned_sqft: 80000, acquisition_cost: 2_150_000, hard_costs: 8_400_000, soft_costs: 1_350_000, financing_costs: 620_000, contingency_pct: 10, projected_revenue: 13_600_000, target_margin_pct: 18, total_cost: 13_495_000, projected_profit: 105_000 },
  { id: "pf-3", property_id: "prop-mill", scenario: "Base case — 36 units", status: "approved", planned_units: 36, planned_sqft: 41400, acquisition_cost: 1_400_000, hard_costs: 5_200_000, soft_costs: 780_000, financing_costs: 340_000, contingency_pct: 7, projected_revenue: 9_400_000, target_margin_pct: 16, total_cost: 8_138_600, projected_profit: 1_261_400 },
];

export const demoComparables: Comparable[] = [
  { id: "cp-1", property_id: "prop-cedar", address: "3900 Cedar Hollow Rd", sale_price: 1_950_000, sale_date: "2025-01-14", building_sqft: null, lot_size_acres: 11.2, distance_miles: 0.4, price_per_sqft: null, latitude: null, longitude: null },
  { id: "cp-2", property_id: "prop-cedar", address: "210 Ranch House Rd", sale_price: 2_420_000, sale_date: "2024-11-02", building_sqft: null, lot_size_acres: 14.0, distance_miles: 1.8, price_per_sqft: null, latitude: null, longitude: null },
  { id: "cp-3", property_id: "prop-mill", address: "104 Mill Creek Way", sale_price: 1_280_000, sale_date: "2025-02-20", building_sqft: null, lot_size_acres: 4.6, distance_miles: 0.2, price_per_sqft: null, latitude: null, longitude: null },
];

export const demoOffers: Offer[] = [
  { id: "of-1", property_id: "prop-cedar", amount: 1_925_000, status: "countered", offered_at: "2025-05-10", expires_at: "2025-05-24", earnest_money: 50_000, due_diligence_days: 45, notes: "Seller countered at $2.05M." },
  { id: "of-2", property_id: "prop-mill", amount: 1_360_000, status: "accepted", offered_at: "2025-04-02", expires_at: null, earnest_money: 40_000, due_diligence_days: 60, notes: "Executed; feasibility period runs to Aug 14." },
  { id: "of-3", property_id: "prop-quarry", amount: 3_100_000, status: "withdrawn", offered_at: "2025-03-01", expires_at: null, earnest_money: null, due_diligence_days: 30, notes: "Withdrawn after the floodplain study." },
];

/* ------------------------------------------------------------------ */

const P = demoProjects;

export const demoBuildings: Building[] = [
  { id: "bl-1", project_id: P[0]!.id, name: "Building A", building_type: "multifamily", status: "under_construction", floors: 3, gross_sqft: 42000, permit_number: "BP-2025-0412" },
  { id: "bl-2", project_id: P[0]!.id, name: "Building B", building_type: "multifamily", status: "permitting", floors: 3, gross_sqft: 42000, permit_number: null },
  { id: "bl-3", project_id: P[1]!.id, name: "Townhome Row 1", building_type: "townhome", status: "under_construction", floors: 2, gross_sqft: 18600, permit_number: "BP-2025-0388" },
];

export const demoUnits: Unit[] = [
  { id: "u-1", building_id: "bl-1", project_id: P[0]!.id, unit_number: "101", unit_type: "2BR", status: "complete", bedrooms: 2, bathrooms: 2, sqft: 980, list_price: 385_000 },
  { id: "u-2", building_id: "bl-1", project_id: P[0]!.id, unit_number: "102", unit_type: "2BR", status: "sold", bedrooms: 2, bathrooms: 2, sqft: 980, list_price: 385_000 },
  { id: "u-3", building_id: "bl-1", project_id: P[0]!.id, unit_number: "201", unit_type: "3BR", status: "under_construction", bedrooms: 3, bathrooms: 2, sqft: 1240, list_price: 452_000 },
  { id: "u-4", building_id: "bl-2", project_id: P[0]!.id, unit_number: "101", unit_type: "1BR", status: "planned", bedrooms: 1, bathrooms: 1, sqft: 720, list_price: 298_000 },
  { id: "u-5", building_id: "bl-3", project_id: P[1]!.id, unit_number: "A", unit_type: "3BR TH", status: "under_construction", bedrooms: 3, bathrooms: 2.5, sqft: 1680, list_price: 512_000 },
  { id: "u-6", building_id: "bl-3", project_id: P[1]!.id, unit_number: "B", unit_type: "3BR TH", status: "reserved", bedrooms: 3, bathrooms: 2.5, sqft: 1680, list_price: 512_000 },
];

export const demoSubcontractors: Subcontractor[] = [
  { id: "sub-ace", company_name: "Ace Concrete", trade: "concrete", contact_name: "Ray Delgado", email: "ray@aceconcrete.example", phone: "512-555-0143", license_number: "TX-C-88213", insurance_expires_at: daysFromNow(-12), is_approved: true, rating: 4.5 },
  { id: "sub-volt", company_name: "Voltline Electric", trade: "electrical", contact_name: "Nina Park", email: "nina@voltline.example", phone: "512-555-0177", license_number: "TX-E-44190", insurance_expires_at: daysFromNow(41), is_approved: true, rating: 4.0 },
  { id: "sub-clear", company_name: "Clearwater Plumbing", trade: "plumbing", contact_name: "Sam Ortiz", email: "sam@clearwaterpl.example", phone: "512-555-0121", license_number: "TX-P-20551", insurance_expires_at: daysFromNow(240), is_approved: true, rating: 4.8 },
  { id: "sub-north", company_name: "Northface Framing", trade: "general", contact_name: "Dev Rao", email: "dev@northface.example", phone: "512-555-0190", license_number: null, insurance_expires_at: null, is_approved: false, rating: null },
  { id: "sub-lumen", company_name: "Lumen Finishes", trade: "finishes", contact_name: "Ivy Chen", email: "ivy@lumenfin.example", phone: "512-555-0166", license_number: "TX-F-71002", insurance_expires_at: daysFromNow(155), is_approved: true, rating: 4.2 },
];

export const demoBidPackages: BidPackage[] = [
  { id: "bp-1", project_id: P[0]!.id, name: "Foundations & flatwork", trade: "concrete", scope_description: "Piers, slabs, sidewalks and approaches for Buildings A and B.", budget: 890_000, status: "awarded", due_at: "2025-04-18" },
  { id: "bp-2", project_id: P[0]!.id, name: "Electrical rough & finish", trade: "electrical", scope_description: "Full electrical scope, both buildings, excluding low voltage.", budget: 640_000, status: "open", due_at: "2025-06-06" },
  { id: "bp-3", project_id: P[1]!.id, name: "Plumbing package", trade: "plumbing", scope_description: "Under-slab through trim, 12 townhome units.", budget: 310_000, status: "closed", due_at: "2025-05-20" },
];

export const demoQuotes: Quote[] = [
  { id: "q-1", bid_package_id: "bp-1", subcontractor_id: "sub-ace", amount: 862_000, status: "accepted", duration_days: 75, submitted_at: "2025-04-14", exclusions: "Excludes rock excavation." },
  { id: "q-2", bid_package_id: "bp-2", subcontractor_id: "sub-volt", amount: 618_500, status: "shortlisted", duration_days: 90, submitted_at: "2025-06-01", exclusions: "Excludes temporary power." },
  { id: "q-3", bid_package_id: "bp-2", subcontractor_id: "sub-north", amount: 574_000, status: "received", duration_days: 110, submitted_at: "2025-06-03", exclusions: "Excludes fixtures, permits and temporary power." },
  { id: "q-4", bid_package_id: "bp-3", subcontractor_id: "sub-clear", amount: 298_400, status: "accepted", duration_days: 60, submitted_at: "2025-05-16", exclusions: "Excludes gas piping." },
];

export const demoContracts: Contract[] = [
  { id: "ct-1", project_id: P[0]!.id, subcontractor_id: "sub-ace", contract_number: "SC-2025-001", title: "Foundations & flatwork", trade: "concrete", original_amount: 862_000, status: "in_progress", retainage_pct: 10, starts_on: "2025-05-01", ends_on: "2025-07-15" },
  { id: "ct-2", project_id: P[1]!.id, subcontractor_id: "sub-clear", contract_number: "SC-2025-002", title: "Plumbing package", trade: "plumbing", original_amount: 298_400, status: "executed", retainage_pct: 10, starts_on: "2025-06-02", ends_on: "2025-08-01" },
  { id: "ct-3", project_id: P[0]!.id, subcontractor_id: "sub-lumen", contract_number: "SC-2025-003", title: "Interior finishes — Building A", trade: "finishes", original_amount: 445_000, status: "draft", retainage_pct: 5, starts_on: null, ends_on: null },
];

export const demoChangeOrders: ChangeOrder[] = [
  { id: "co-1", contract_id: "ct-1", project_id: P[0]!.id, number: 1, description: "Additional piers, north third (expansive clay).", reason: "unforeseen_condition", amount: 48_500, days_impact: 9, status: "approved", submitted_at: "2025-05-20" },
  { id: "co-2", contract_id: "ct-1", project_id: P[0]!.id, number: 2, description: "Deleted decorative banding at approaches.", reason: "owner_request", amount: -6_200, days_impact: 0, status: "approved", submitted_at: "2025-06-02" },
  { id: "co-3", contract_id: "ct-1", project_id: P[0]!.id, number: 3, description: "Storm drain re-route around heritage oaks.", reason: "code_requirement", amount: 22_750, days_impact: 5, status: "submitted", submitted_at: "2025-06-18" },
  { id: "co-4", contract_id: "ct-2", project_id: P[1]!.id, number: 1, description: "Upgrade to cast iron waste at party walls.", reason: "design_error", amount: 14_100, days_impact: 3, status: "submitted", submitted_at: "2025-06-21" },
];

/** Mirrors the contract_totals view: original plus *approved* changes only. */
export const demoContractTotals: ContractTotal[] = demoContracts.map((contract) => {
  const orders = demoChangeOrders.filter((co) => co.contract_id === contract.id);
  const approved = orders.filter((co) => co.status === "approved");
  const pending = orders.filter((co) => co.status === "submitted");
  const sum = (list: ChangeOrder[]) => list.reduce((total, co) => total + co.amount, 0);

  return {
    contract_id: contract.id,
    original_amount: contract.original_amount,
    approved_changes: sum(approved),
    pending_changes: sum(pending),
    current_amount: contract.original_amount + sum(approved),
    approved_days_impact: approved.reduce((total, co) => total + co.days_impact, 0),
  };
});
