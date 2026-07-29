"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Moves a task onto (or off) a day. In demo mode there is no database to write
 * to, so the client keeps its optimistic state and this resolves quietly.
 */
export async function scheduleTask(taskId: string, date: string | null) {
  const db = await createClient();
  if (!db) return { ok: true, persisted: false as const };

  const { error } = await db
    .from("tasks")
    .update({
      starts_at: date,
      ends_at: date,
      status: date ? "scheduled" : "unscheduled",
    })
    .eq("id", taskId);

  if (error) return { ok: false as const, persisted: false as const, error: error.message };

  revalidatePath("/schedule");
  revalidatePath("/tasks");
  return { ok: true as const, persisted: true as const };
}

export async function createTask(input: {
  projectId: string;
  title: string;
  trade: string;
  date: string | null;
  crewSize: number;
}) {
  const db = await createClient();
  if (!db) return { ok: true, persisted: false as const };

  const { data: profile } = await db
    .from("profiles")
    .select("org_id")
    .eq("id", (await db.auth.getUser()).data.user?.id ?? "")
    .single();

  const { error } = await db.from("tasks").insert({
    org_id: profile?.org_id,
    project_id: input.projectId,
    title: input.title,
    trade: input.trade,
    crew_size: input.crewSize,
    starts_at: input.date,
    ends_at: input.date,
    status: input.date ? "scheduled" : "unscheduled",
  });

  if (error) return { ok: false as const, persisted: false as const, error: error.message };

  revalidatePath("/schedule");
  revalidatePath("/tasks");
  return { ok: true as const, persisted: true as const };
}
