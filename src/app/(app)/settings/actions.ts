"use server";

import { revalidatePath } from "next/cache";
import { bool, callerOrg, readableError, str, type ActionResult } from "@/lib/forms";

/**
 * Editing your own profile.
 *
 * Migration 0004 revoked UPDATE on profiles and granted it back column by
 * column — full_name, initials, avatar_url, on_site_today, trade. Naming those
 * same columns here is not belt-and-braces: it is what keeps the failure a
 * quiet no-op in the application rather than a permission error from Postgres
 * if someone later adds a field to this form that the grant does not cover.
 */
export async function updateProfile(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const fullName = str(data, "full_name");
  if (!fullName) return { ok: false, error: "Your name cannot be empty." };

  // Initials are shown in avatars where there is no room for a name, so they are
  // derived rather than demanded when left blank.
  const initials =
    str(data, "initials")?.toUpperCase().slice(0, 3) ??
    fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

  const { error } = await caller.db
    .from("profiles")
    .update({
      full_name: fullName,
      initials,
      trade: str(data, "trade"),
      on_site_today: bool(data, "on_site_today"),
    })
    .eq("id", caller.userId);

  if (error) return { ok: false, error: readableError(error) };

  revalidatePath("/settings");
  revalidatePath("/teams");
  return { ok: true };
}

/**
 * Renaming the organization.
 *
 * Admin-only, and the check is in the database — the "org admins rename org"
 * policy from 0004. The guard below exists to produce a sentence a person can
 * act on instead of an empty result, not to be the thing standing in the way.
 */
export async function updateOrganization(data: FormData): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const { data: profile } = await caller.db
    .from("profiles")
    .select("is_admin")
    .eq("id", caller.userId)
    .single();

  if (!(profile as { is_admin: boolean } | null)?.is_admin) {
    return { ok: false, error: "Only admins can rename the organization." };
  }

  const name = str(data, "name");
  if (!name) return { ok: false, error: "The organization needs a name." };

  const { data: updated, error } = await caller.db
    .from("organizations")
    .update({ name })
    .eq("id", caller.orgId)
    .select("id");

  if (error) return { ok: false, error: readableError(error) };
  if (!updated || updated.length === 0) {
    return { ok: false, error: "You do not have permission to rename this organization." };
  }

  revalidatePath("/settings");
  return { ok: true };
}
