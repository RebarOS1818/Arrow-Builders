"use server";

import { revalidatePath } from "next/cache";
import { callerOrg, num, readableError, str, updateOwned, type ActionResult } from "@/lib/forms";
import type { ApprovalStatus } from "@/lib/types";

/**
 * Approves or rejects a pending item.
 *
 * The `status = 'pending'` filter is what makes a double click harmless: the
 * second update matches no row, and the caller is told the item was already
 * decided rather than silently overwriting someone else's decision.
 */
export async function decideApproval(
  id: string,
  decision: Extract<ApprovalStatus, "approved" | "rejected">,
): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const { data, error } = await caller.db
    .from("approvals")
    .update({ status: decision })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");

  if (error) return { ok: false, error: readableError(error) };

  // Row level security filters silently, so an empty result means either the
  // item belongs to another organization or someone else got there first.
  if (!data || data.length === 0) {
    return { ok: false, error: "That item has already been decided." };
  }

  revalidatePath("/approvals");
  return { ok: true };
}

/**
 * Correcting the item itself — its reference, type, amount or project.
 *
 * Separate from deciding it, and deliberately not able to set the status: a
 * decision is an event with a decider, and letting an edit form flip it to
 * "approved" would put a sign-off in the record that nobody made.
 */
export async function updateApproval(data: FormData): Promise<ActionResult> {
  const reference = str(data, "reference");
  if (!reference) return { ok: false, error: "Give the item a reference." };

  const amount = num(data, "amount");
  if (amount !== null && amount < 0) {
    return { ok: false, error: "An amount cannot be negative." };
  }

  return updateOwned(
    "approvals",
    str(data, "id"),
    {
      reference,
      kind: str(data, "kind"),
      project_id: str(data, "project_id"),
      amount,
    },
    ["/approvals", "/"],
  );
}
