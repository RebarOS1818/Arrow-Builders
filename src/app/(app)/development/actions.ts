"use server";

import { revalidatePath } from "next/cache";
import { bool, callerOrg, num, readableError, str, type ActionResult } from "@/lib/forms";

/**
 * Writes for the development phase.
 *
 * Every one resolves org_id from the signed-in user's profile rather than
 * accepting it from the form. Row level security would let a submitted org_id
 * through if it happened to be one the user belongs to, so the server deciding
 * is what makes the isolation actually hold.
 */

function revalidateProperty(id?: string) {
  revalidatePath("/development");
  if (id) revalidatePath(`/development/${id}`);
}

export async function createProperty(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const name = str(data, "name");
  if (!name) return { ok: false, error: "Give the property a name." };

  const { error } = await caller.db.from("properties").insert({
    org_id: caller.orgId,
    name,
    address: str(data, "address") ?? "",
    city: str(data, "city") ?? "",
    state: str(data, "state") ?? "",
    parcel_number: str(data, "parcel_number"),
    lot_size_acres: num(data, "lot_size_acres"),
    zoning_code: str(data, "zoning_code"),
    asking_price: num(data, "asking_price"),
    status: str(data, "status") ?? "prospect",
    notes: str(data, "notes") ?? "",
  });

  if (error) return { ok: false, error: readableError(error) };
  revalidateProperty();
  return { ok: true };
}

export async function createStudy(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const propertyId = str(data, "property_id");
  const kind = str(data, "kind");
  if (!propertyId || !kind) return { ok: false, error: "Pick a study type." };

  const status = str(data, "status") ?? "not_started";
  const verdict = str(data, "verdict");

  // The database refuses this combination too. Catching it here means the
  // person gets a sentence rather than a constraint name.
  if (verdict && status !== "complete") {
    return {
      ok: false,
      error: "A verdict can only be recorded once the study is complete.",
    };
  }

  const { error } = await caller.db.from("feasibility_studies").insert({
    org_id: caller.orgId,
    property_id: propertyId,
    kind,
    status,
    verdict,
    findings: str(data, "findings") ?? "",
    consultant: str(data, "consultant") ?? "",
    cost: num(data, "cost"),
    completed_at: status === "complete" ? (str(data, "completed_at") ?? new Date().toISOString().slice(0, 10)) : null,
    assessed_by: caller.userId,
  });

  if (error) return { ok: false, error: readableError(error) };
  revalidateProperty(propertyId);
  return { ok: true };
}

export async function createConstraint(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const propertyId = str(data, "property_id");
  const kind = str(data, "kind");
  if (!propertyId || !kind) return { ok: false, error: "Describe what the constraint is." };

  const { error } = await caller.db.from("site_constraints").insert({
    org_id: caller.orgId,
    property_id: propertyId,
    kind,
    severity: str(data, "severity") ?? "minor",
    description: str(data, "description") ?? "",
    affects_buildable_area: bool(data, "affects_buildable_area"),
  });

  if (error) return { ok: false, error: readableError(error) };
  revalidateProperty(propertyId);
  return { ok: true };
}

export async function createProForma(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const propertyId = str(data, "property_id");
  if (!propertyId) return { ok: false, error: "Missing property." };

  // total_cost and projected_profit are generated columns — deliberately not
  // sent, so the arithmetic lives in one place.
  const { error } = await caller.db.from("pro_formas").insert({
    org_id: caller.orgId,
    property_id: propertyId,
    scenario: str(data, "scenario") ?? "Base case",
    status: str(data, "status") ?? "draft",
    planned_units: num(data, "planned_units") ?? 0,
    planned_sqft: num(data, "planned_sqft") ?? 0,
    acquisition_cost: num(data, "acquisition_cost") ?? 0,
    hard_costs: num(data, "hard_costs") ?? 0,
    soft_costs: num(data, "soft_costs") ?? 0,
    financing_costs: num(data, "financing_costs") ?? 0,
    contingency_pct: num(data, "contingency_pct") ?? 0,
    projected_revenue: num(data, "projected_revenue") ?? 0,
    target_margin_pct: num(data, "target_margin_pct") ?? 0,
    notes: str(data, "notes") ?? "",
    prepared_by: caller.userId,
  });

  if (error) return { ok: false, error: readableError(error) };
  revalidateProperty(propertyId);
  return { ok: true };
}

export async function createComparable(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const propertyId = str(data, "property_id");
  const address = str(data, "address");
  if (!propertyId || !address) return { ok: false, error: "Give the comparable an address." };

  const { error } = await caller.db.from("comparables").insert({
    org_id: caller.orgId,
    property_id: propertyId,
    address,
    sale_price: num(data, "sale_price"),
    sale_date: str(data, "sale_date"),
    lot_size_acres: num(data, "lot_size_acres"),
    building_sqft: num(data, "building_sqft"),
    distance_miles: num(data, "distance_miles"),
    source: str(data, "source") ?? "",
  });

  if (error) return { ok: false, error: readableError(error) };
  revalidateProperty(propertyId);
  return { ok: true };
}

export async function createOffer(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const propertyId = str(data, "property_id");
  const amount = num(data, "amount");
  if (!propertyId) return { ok: false, error: "Missing property." };
  if (amount === null || amount < 0) return { ok: false, error: "Enter the offer amount." };

  const { error } = await caller.db.from("offers").insert({
    org_id: caller.orgId,
    property_id: propertyId,
    amount,
    status: str(data, "status") ?? "draft",
    offered_at: str(data, "offered_at") ?? new Date().toISOString().slice(0, 10),
    expires_at: str(data, "expires_at"),
    earnest_money: num(data, "earnest_money"),
    due_diligence_days: num(data, "due_diligence_days"),
    notes: str(data, "notes") ?? "",
    submitted_by: caller.userId,
  });

  if (error) return { ok: false, error: readableError(error) };
  revalidateProperty(propertyId);
  return { ok: true };
}
