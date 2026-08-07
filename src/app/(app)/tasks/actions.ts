"use server";

import { revalidatePath } from "next/cache";
import {
  buildingProblem,
  callerOrg,
  num,
  readableError,
  str,
  updateOwned,
  type ActionResult,
} from "@/lib/forms";

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

export async function updateTask(data: FormData): Promise<ActionResult> {
  const title = str(data, "title");
  if (!title) return { ok: false, error: "Give the task a title." };

  const startsAt = str(data, "starts_at");
  const endsAt = str(data, "ends_at");
  if (startsAt && endsAt && endsAt < startsAt) {
    return { ok: false, error: "The end date is before the start date." };
  }

  // The building picker is only drawn when the task's project has buildings, so
  // a form that never showed it must not be read as one that cleared it. Hence
  // `has` rather than the value: absent means leave alone, present-and-blank
  // means unlink.
  const buildingId = str(data, "building_id");
  if (buildingId) {
    const caller = await callerOrg();
    if (!caller.ok) return caller;
    const problem = await buildingProblem(caller.db, buildingId, str(data, "project_id"));
    if (problem) return { ok: false, error: problem };
  }

  return updateOwned(
    "tasks",
    str(data, "id"),
    {
      title,
      ...(data.has("building_id") ? { building_id: buildingId } : {}),
      // A task can be moved to another project: unlike a quote's bid package,
      // this is a normal correction rather than a change of meaning.
      ...(str(data, "project_id") ? { project_id: str(data, "project_id") } : {}),
      trade: str(data, "trade") ?? "general",
      status: str(data, "status") ?? (startsAt ? "scheduled" : "unscheduled"),
      starts_at: startsAt,
      ends_at: endsAt,
      crew_size: Math.max(0, Math.round(num(data, "crew_size") ?? 0)),
    },
    ["/tasks", "/schedule", "/"],
  );
}
