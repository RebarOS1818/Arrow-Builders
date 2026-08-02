"use server";

import { revalidatePath } from "next/cache";
import { callerOrg, readableError, type ActionResult } from "@/lib/forms";
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
