"use server";

import { revalidatePath } from "next/cache";
import { bool, callerOrg, num, readableError, str, type ActionResult } from "@/lib/forms";

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
