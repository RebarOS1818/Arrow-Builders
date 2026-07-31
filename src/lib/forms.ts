import "server-only";

import { createClient } from "./supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Resolves the caller's organization, or explains why it cannot.
 *
 * Every write goes through this. The org_id is taken from the signed-in user's
 * profile and never from the submitted form — a client that can name its own
 * org_id can write into someone else's, and row level security would happily
 * allow it if the value matched a real organization the attacker belonged to.
 */
export async function callerOrg(): Promise<
  | { ok: true; db: NonNullable<Awaited<ReturnType<typeof createClient>>>; orgId: string; userId: string }
  | { ok: false; error: string }
> {
  const db = await createClient();
  if (!db) {
    return {
      ok: false,
      error: "This is the demo dataset. Connect Supabase to save records.",
    };
  }

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };

  const { data: profile } = await db
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const orgId = (profile as { org_id: string | null } | null)?.org_id;
  if (!orgId) return { ok: false, error: "Your account has no organization." };

  return { ok: true, db, orgId, userId: user.id };
}

/** Trimmed string, or null when the field was left blank. */
export function str(data: FormData, key: string): string | null {
  const value = data.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Required string. Returns null when missing so the caller can report it. */
export function text(data: FormData, key: string): string | null {
  return str(data, key);
}

/**
 * Number, or null when blank.
 *
 * Returns null for anything unparseable rather than NaN, which Postgres would
 * reject with a message about invalid input syntax that means nothing to a
 * person filling in a form.
 */
export function num(data: FormData, key: string): number | null {
  const raw = str(data, key);
  if (raw === null) return null;
  const parsed = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function bool(data: FormData, key: string): boolean {
  return data.get(key) === "on";
}

/** Turns a Postgres error into something worth showing a person. */
export function readableError(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "That record already exists.";
  if (error.code === "23503") return "A linked record is missing or was deleted.";
  if (error.code === "23514") {
    // Check constraints carry the rule in their name, which is more useful than
    // the raw violation text.
    if (error.message.includes("verdict_requires_completion")) {
      return "A verdict can only be recorded once the study is complete.";
    }
    if (error.message.includes("decision_requires_date")) {
      return "Approving or rejecting a change order needs a decision date.";
    }
    return "That combination of values is not allowed.";
  }
  if (error.code === "42501" || error.message.includes("row-level security")) {
    return "You do not have permission to save that.";
  }
  return error.message;
}
