"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Moves a task onto (or off) a day. In demo mode there is no database to write
 * to, so the client keeps its optimistic state and this resolves quietly.
 */
export type ActionResult =
  | { ok: true; persisted: boolean }
  | { ok: false; persisted: false; error: string };

export async function scheduleTask(taskId: string, date: string | null): Promise<ActionResult> {
  const db = await createClient();
  if (!db) return { ok: true, persisted: false };

  const { error } = await db
    .from("tasks")
    .update({
      starts_at: date,
      ends_at: date,
      status: date ? "scheduled" : "unscheduled",
    })
    .eq("id", taskId);

  if (error) return { ok: false, persisted: false, error: error.message };

  revalidatePath("/schedule");
  revalidatePath("/tasks");
  return { ok: true, persisted: true };
}

export async function createTask(input: {
  projectId: string;
  title: string;
  trade: string;
  date: string | null;
  crewSize: number;
}): Promise<ActionResult> {
  const db = await createClient();
  if (!db) return { ok: true, persisted: false };

  const { data: profile } = await db
    .from("profiles")
    .select("org_id")
    .eq("id", (await db.auth.getUser()).data.user?.id ?? "")
    .single();

  if (!profile?.org_id) {
    return {
      ok: false,
      persisted: false,
      error: "Your account is not attached to an organization yet.",
    };
  }

  const { error } = await db.from("tasks").insert({
    org_id: profile.org_id,
    project_id: input.projectId,
    title: input.title,
    trade: input.trade,
    crew_size: input.crewSize,
    starts_at: input.date,
    ends_at: input.date,
    status: input.date ? "scheduled" : "unscheduled",
  });

  if (error) return { ok: false, persisted: false, error: error.message };

  revalidatePath("/schedule");
  revalidatePath("/tasks");
  return { ok: true, persisted: true };
}
