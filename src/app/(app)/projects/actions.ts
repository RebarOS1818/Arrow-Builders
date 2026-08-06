"use server";

import { revalidatePath } from "next/cache";
import { callerOrg, num, readableError, str, type ActionResult } from "@/lib/forms";

/**
 * Creating a project.
 *
 * This was the gap that made the rest of the app unreachable on a fresh
 * account: contracts, change orders, bid packages and documents all hang off a
 * project, and there was no way to make one without opening the SQL editor.
 */
export async function createProject(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const name = str(data, "name");
  if (!name) return { ok: false, error: "Give the project a name." };

  const completion = num(data, "completion_pct") ?? 0;
  if (completion < 0 || completion > 100) {
    return { ok: false, error: "Completion must be between 0 and 100." };
  }

  const budgetTotal = num(data, "budget_total") ?? 0;
  const budgetSpent = num(data, "budget_spent") ?? 0;
  // Not a database constraint — a project can genuinely run over — but a spend
  // above budget entered on day one is almost always a swapped pair of fields.
  if (budgetTotal > 0 && budgetSpent > budgetTotal * 2) {
    return { ok: false, error: "Spent is more than double the budget. Check the two figures." };
  }

  const { error } = await caller.db.from("projects").insert({
    org_id: caller.orgId,
    name,
    city: str(data, "city") ?? "",
    state: str(data, "state") ?? "",
    status: str(data, "status") ?? "on_schedule",
    completion_pct: Math.round(completion),
    budget_total: budgetTotal,
    budget_spent: budgetSpent,
    target_date: str(data, "target_date"),
    property_id: str(data, "property_id"),
  });

  if (error) return { ok: false, error: readableError(error) };

  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath("/construction");
  return { ok: true };
}

/**
 * Updating a project.
 *
 * Progress and spend are the two figures that change every week, and until now
 * there was no way to move either without the SQL editor. The id comes from the
 * form but is scoped by org_id in the filter, so a submitted id belonging to
 * another tenant matches nothing rather than updating it.
 */
export async function updateProject(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const id = str(data, "id");
  if (!id) return { ok: false, error: "Which project?" };

  const name = str(data, "name");
  if (!name) return { ok: false, error: "The project needs a name." };

  const completion = num(data, "completion_pct") ?? 0;
  if (completion < 0 || completion > 100) {
    return { ok: false, error: "Completion must be between 0 and 100." };
  }

  const { data: updated, error } = await caller.db
    .from("projects")
    .update({
      name,
      city: str(data, "city") ?? "",
      state: str(data, "state") ?? "",
      status: str(data, "status") ?? "on_schedule",
      completion_pct: Math.round(completion),
      budget_total: num(data, "budget_total") ?? 0,
      budget_spent: num(data, "budget_spent") ?? 0,
      target_date: str(data, "target_date"),
      // Blank clears it. A project entered before the parcel existed has to be
      // linkable afterwards, or the link only ever works for projects created
      // from now on — which is every project except the ones already there.
      property_id: str(data, "property_id") ?? null,
    })
    .eq("id", id)
    .eq("org_id", caller.orgId)
    .select("id");

  if (error) return { ok: false, error: readableError(error) };
  if (!updated || updated.length === 0) {
    return { ok: false, error: "That project no longer exists." };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
  return { ok: true };
}
