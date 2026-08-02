"use server";

import { revalidatePath } from "next/cache";
import { callerOrg, num, readableError, str, type ActionResult } from "@/lib/forms";

export async function createTask(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const title = str(data, "title");
  if (!title) return { ok: false, error: "Give the task a title." };

  const projectId = str(data, "project_id");
  if (!projectId) return { ok: false, error: "Choose a project." };

  const startsAt = str(data, "starts_at");
  const endsAt = str(data, "ends_at");
  if (startsAt && endsAt && endsAt < startsAt) {
    return { ok: false, error: "The end date is before the start date." };
  }

  // A task with dates is scheduled by definition; leaving it 'unscheduled' would
  // hide it from the board it belongs on.
  const status = str(data, "status") ?? (startsAt ? "scheduled" : "unscheduled");

  const { error } = await caller.db.from("tasks").insert({
    org_id: caller.orgId,
    project_id: projectId,
    title,
    trade: str(data, "trade") ?? "general",
    status,
    starts_at: startsAt,
    ends_at: endsAt,
    crew_size: Math.max(0, Math.round(num(data, "crew_size") ?? 0)),
  });

  if (error) return { ok: false, error: readableError(error) };

  revalidatePath("/tasks");
  revalidatePath("/schedule");
  return { ok: true };
}
