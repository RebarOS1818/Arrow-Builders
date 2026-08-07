"use server";

import { revalidatePath } from "next/cache";
import {
  bool,
  callerOrg,
  num,
  readableError,
  str,
  updateOwned,
  type ActionResult,
} from "@/lib/forms";

/** Writes for the construction phase. org_id always comes from the profile. */

function revalidateConstruction() {
  revalidatePath("/construction");
  revalidatePath("/");
}

export async function createSubcontractor(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const companyName = str(data, "company_name");
  if (!companyName) return { ok: false, error: "Enter the company name." };

  const { error } = await caller.db.from("subcontractors").insert({
    org_id: caller.orgId,
    company_name: companyName,
    trade: str(data, "trade") ?? "general",
    contact_name: str(data, "contact_name") ?? "",
    email: str(data, "email") ?? "",
    phone: str(data, "phone") ?? "",
    license_number: str(data, "license_number"),
    insurance_expires_at: str(data, "insurance_expires_at"),
    is_approved: bool(data, "is_approved"),
    notes: str(data, "notes") ?? "",
  });

  if (error) return { ok: false, error: readableError(error) };
  revalidateConstruction();
  return { ok: true };
}

export async function createBidPackage(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const projectId = str(data, "project_id");
  const name = str(data, "name");
  if (!projectId || !name) return { ok: false, error: "Pick a project and name the package." };

  const { error } = await caller.db.from("bid_packages").insert({
    org_id: caller.orgId,
    project_id: projectId,
    name,
    trade: str(data, "trade") ?? "general",
    scope_description: str(data, "scope_description") ?? "",
    budget: num(data, "budget"),
    status: str(data, "status") ?? "draft",
    due_at: str(data, "due_at"),
  });

  if (error) return { ok: false, error: readableError(error) };
  revalidateConstruction();
  return { ok: true };
}

export async function createQuote(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const packageId = str(data, "bid_package_id");
  const subId = str(data, "subcontractor_id");
  const amount = num(data, "amount");

  if (!packageId || !subId) return { ok: false, error: "Pick a package and a subcontractor." };
  if (amount === null || amount < 0) return { ok: false, error: "Enter the quoted amount." };

  const { error } = await caller.db.from("quotes").insert({
    org_id: caller.orgId,
    bid_package_id: packageId,
    subcontractor_id: subId,
    amount,
    status: str(data, "status") ?? "received",
    duration_days: num(data, "duration_days"),
    inclusions: str(data, "inclusions") ?? "",
    exclusions: str(data, "exclusions") ?? "",
    valid_until: str(data, "valid_until"),
  });

  if (error) {
    // One live quote per sub per package, so a revised bid replaces rather than
    // duplicating. Worth saying plainly instead of "record already exists".
    if (error.code === "23505") {
      return {
        ok: false,
        error: "That subcontractor has already quoted this package. Edit the existing quote instead.",
      };
    }
    return { ok: false, error: readableError(error) };
  }

  revalidateConstruction();
  return { ok: true };
}

export async function createContract(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const projectId = str(data, "project_id");
  const subId = str(data, "subcontractor_id");
  const number = str(data, "contract_number");
  const title = str(data, "title");
  const amount = num(data, "original_amount");

  if (!projectId || !subId) return { ok: false, error: "Pick a project and a subcontractor." };
  if (!number || !title) return { ok: false, error: "Enter a contract number and title." };
  if (amount === null || amount < 0) return { ok: false, error: "Enter the contract amount." };

  const retainage = num(data, "retainage_pct") ?? 0;
  if (retainage < 0 || retainage > 100) {
    return { ok: false, error: "Retainage must be between 0 and 100 percent." };
  }

  const { error } = await caller.db.from("contracts").insert({
    org_id: caller.orgId,
    project_id: projectId,
    subcontractor_id: subId,
    contract_number: number,
    title,
    trade: str(data, "trade") ?? "general",
    original_amount: amount,
    status: str(data, "status") ?? "draft",
    retainage_pct: retainage,
    starts_on: str(data, "starts_on"),
    ends_on: str(data, "ends_on"),
    notes: str(data, "notes") ?? "",
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `Contract number ${number} is already in use.` };
    }
    return { ok: false, error: readableError(error) };
  }

  revalidateConstruction();
  return { ok: true };
}

export async function createChangeOrder(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const contractId = str(data, "contract_id");
  const description = str(data, "description");
  const amount = num(data, "amount");

  if (!contractId) return { ok: false, error: "Pick a contract." };
  if (!description) return { ok: false, error: "Describe the change." };
  // Deliberately no sign check: a credit back to the owner is negative.
  if (amount === null) return { ok: false, error: "Enter the amount, or 0 for no cost impact." };

  const status = str(data, "status") ?? "draft";
  const decidedAt = str(data, "decided_at");
  if ((status === "approved" || status === "rejected") && !decidedAt) {
    return { ok: false, error: "Approving or rejecting needs a decision date." };
  }

  // The contract carries the project. A trigger also normalises this on the way
  // in, but sending a real value rather than a placeholder means the insert
  // still holds together if that trigger is ever dropped.
  const { data: contract } = await caller.db
    .from("contracts")
    .select("project_id")
    .eq("id", contractId)
    .single();

  const projectId = (contract as { project_id: string } | null)?.project_id;
  if (!projectId) return { ok: false, error: "That contract no longer exists." };

  // Numbering is per contract and sequential, so it is derived here rather than
  // typed — two people raising an order at once would otherwise collide, and the
  // unique index would reject the loser with an opaque message.
  const { data: last } = await caller.db
    .from("change_orders")
    .select("number")
    .eq("contract_id", contractId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = ((last as { number: number } | null)?.number ?? 0) + 1;

  const { error } = await caller.db.from("change_orders").insert({
    org_id: caller.orgId,
    contract_id: contractId,
    project_id: projectId,
    number: nextNumber,
    description,
    reason: str(data, "reason") ?? "owner_request",
    amount,
    days_impact: num(data, "days_impact") ?? 0,
    status,
    submitted_at: str(data, "submitted_at") ?? new Date().toISOString().slice(0, 10),
    decided_at: decidedAt,
    decided_by: status === "approved" || status === "rejected" ? caller.userId : null,
    notes: str(data, "notes") ?? "",
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Someone else just raised a change order. Try again." };
    }
    return { ok: false, error: readableError(error) };
  }

  revalidateConstruction();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Edits                                                               */
/* ------------------------------------------------------------------ */

/*
 * As on the development side, an edit changes what a record says, not what it
 * belongs to: project_id, bid_package_id, subcontractor_id and contract_id are
 * left alone. Re-parenting a quote to a different package is a different
 * operation with different consequences, and doing it silently through an edit
 * form would be a good way to lose a bid.
 */

export async function updateSubcontractor(data: FormData): Promise<ActionResult> {
  const companyName = str(data, "company_name");
  if (!companyName) return { ok: false, error: "Enter the company name." };

  return updateOwned(
    "subcontractors",
    str(data, "id"),
    {
      company_name: companyName,
      trade: str(data, "trade") ?? "general",
      contact_name: str(data, "contact_name") ?? "",
      email: str(data, "email") ?? "",
      phone: str(data, "phone") ?? "",
      license_number: str(data, "license_number"),
      insurance_expires_at: str(data, "insurance_expires_at"),
      is_approved: bool(data, "is_approved"),
      notes: str(data, "notes") ?? "",
    },
    ["/construction"],
  );
}

export async function updateBidPackage(data: FormData): Promise<ActionResult> {
  const name = str(data, "name");
  if (!name) return { ok: false, error: "Name the package." };

  return updateOwned(
    "bid_packages",
    str(data, "id"),
    {
      name,
      trade: str(data, "trade") ?? "general",
      scope_description: str(data, "scope_description") ?? "",
      budget: num(data, "budget"),
      status: str(data, "status") ?? "draft",
      due_at: str(data, "due_at"),
    },
    ["/construction"],
  );
}

export async function updateQuote(data: FormData): Promise<ActionResult> {
  const amount = num(data, "amount");
  if (amount === null || amount < 0) return { ok: false, error: "Enter the quoted amount." };

  return updateOwned(
    "quotes",
    str(data, "id"),
    {
      amount,
      status: str(data, "status") ?? "received",
      duration_days: num(data, "duration_days"),
      inclusions: str(data, "inclusions") ?? "",
      exclusions: str(data, "exclusions") ?? "",
      valid_until: str(data, "valid_until"),
    },
    ["/construction"],
  );
}

export async function updateContract(data: FormData): Promise<ActionResult> {
  const amount = num(data, "original_amount");
  if (amount === null || amount < 0) return { ok: false, error: "Enter the contract amount." };

  return updateOwned(
    "contracts",
    str(data, "id"),
    {
      original_amount: amount,
      trade: str(data, "trade") ?? "general",
      status: str(data, "status") ?? "draft",
      starts_on: str(data, "starts_on"),
      ends_on: str(data, "ends_on"),
      notes: str(data, "notes") ?? "",
    },
    ["/construction"],
  );
}

export async function updateChangeOrder(data: FormData): Promise<ActionResult> {
  const description = str(data, "description");
  if (!description) return { ok: false, error: "Describe the change." };

  const amount = num(data, "amount");
  if (amount === null) {
    return { ok: false, error: "Enter the amount, or 0 for no cost impact." };
  }

  const status = str(data, "status") ?? "draft";
  const decidedAt = str(data, "decided_at");
  // The database enforces this too; saying it here gives a sentence instead of
  // a constraint name.
  if ((status === "approved" || status === "rejected") && !decidedAt) {
    return { ok: false, error: "Approving or rejecting a change order needs a decision date." };
  }

  return updateOwned(
    "change_orders",
    str(data, "id"),
    {
      description,
      amount,
      reason: str(data, "reason") ?? "owner_request",
      days_impact: num(data, "days_impact") ?? 0,
      status,
      decided_at: decidedAt,
      notes: str(data, "notes") ?? "",
    },
    ["/construction"],
  );
}

/* ------------------------------------------------------------------ */
/* Buildings and units                                                 */
/* ------------------------------------------------------------------ */

export async function createBuilding(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const projectId = str(data, "project_id");
  const name = str(data, "name");
  if (!projectId) return { ok: false, error: "Which project?" };
  if (!name) return { ok: false, error: "Give the building a number or a name." };

  const { error } = await caller.db.from("buildings").insert({
    org_id: caller.orgId,
    project_id: projectId,
    name,
    building_type: str(data, "building_type") ?? "single_family",
    status: str(data, "status") ?? "planned",
    floors: num(data, "floors") ?? 1,
    gross_sqft: num(data, "gross_sqft"),
    permit_number: str(data, "permit_number"),
    permit_issued_at: str(data, "permit_issued_at"),
    // Both optional. `str` gives null for a blank select, which is what clears
    // the link rather than storing an empty string the foreign key would reject.
    property_id: str(data, "property_id"),
    manager_id: str(data, "manager_id"),
    notes: str(data, "notes") ?? "",
  });

  if (error) return { ok: false, error: readableError(error) };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function updateBuilding(data: FormData): Promise<ActionResult> {
  const name = str(data, "name");
  if (!name) return { ok: false, error: "The building needs a number or a name." };

  const projectId = str(data, "project_id");
  return updateOwned(
    "buildings",
    str(data, "id"),
    {
      name,
      building_type: str(data, "building_type"),
      status: str(data, "status"),
      floors: num(data, "floors") ?? 1,
      gross_sqft: num(data, "gross_sqft"),
      permit_number: str(data, "permit_number"),
      permit_issued_at: str(data, "permit_issued_at"),
      completed_at: str(data, "completed_at"),
      // Written unconditionally, so clearing the select clears the link. A
      // spread-when-present would make these two fields the only ones on the
      // form that cannot be unset.
      property_id: str(data, "property_id"),
      manager_id: str(data, "manager_id"),
    },
    projectId ? [`/projects/${projectId}`] : [],
  );
}

/**
 * A unit.
 *
 * `project_id` is not taken from the form. The database has a trigger that
 * makes a unit inherit its building's project, and sending one that disagrees
 * would either be overwritten or rejected — so the building is the only parent
 * asked for, and the rest follows from it.
 */
export async function createUnit(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const buildingId = str(data, "building_id");
  const unitNumber = str(data, "unit_number");
  if (!buildingId) return { ok: false, error: "Which building?" };
  if (!unitNumber) return { ok: false, error: "Give the unit a number." };

  const { data: building } = await caller.db
    .from("buildings")
    .select("id, project_id")
    .eq("id", buildingId)
    .maybeSingle();
  if (!building) return { ok: false, error: "That building no longer exists." };

  const { error } = await caller.db.from("units").insert({
    org_id: caller.orgId,
    building_id: buildingId,
    project_id: (building as { project_id: string }).project_id,
    unit_number: unitNumber,
    unit_type: str(data, "unit_type") ?? "",
    status: str(data, "status") ?? "planned",
    floor: num(data, "floor"),
    bedrooms: num(data, "bedrooms"),
    bathrooms: num(data, "bathrooms"),
    sqft: num(data, "sqft"),
    list_price: num(data, "list_price"),
  });

  if (error) {
    // The unique index on (building_id, unit_number) is the likeliest failure,
    // and "duplicate key" is not what somebody typing "101" needs to read.
    if (error.code === "23505") {
      return { ok: false, error: `Unit ${unitNumber} already exists in this building.` };
    }
    return { ok: false, error: readableError(error) };
  }

  revalidatePath(`/projects/${(building as { project_id: string }).project_id}`);
  return { ok: true };
}

export async function updateUnit(data: FormData): Promise<ActionResult> {
  const unitNumber = str(data, "unit_number");
  if (!unitNumber) return { ok: false, error: "The unit needs a number." };

  const status = str(data, "status");
  const soldPrice = num(data, "sold_price");
  // Sold is the one status that carries money. A sold unit with no figure is
  // the case that quietly zeroes a building's revenue, so it is refused here
  // rather than discovered in a total.
  if (status === "sold" && soldPrice === null) {
    return { ok: false, error: "A sold unit needs the price it closed at." };
  }

  const projectId = str(data, "project_id");
  return updateOwned(
    "units",
    str(data, "id"),
    {
      unit_number: unitNumber,
      unit_type: str(data, "unit_type") ?? "",
      status,
      floor: num(data, "floor"),
      bedrooms: num(data, "bedrooms"),
      bathrooms: num(data, "bathrooms"),
      sqft: num(data, "sqft"),
      list_price: num(data, "list_price"),
      sold_price: soldPrice,
      closed_at: str(data, "closed_at"),
    },
    projectId ? [`/projects/${projectId}`] : [],
  );
}
