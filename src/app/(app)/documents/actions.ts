"use server";

import { revalidatePath } from "next/cache";
import { callerOrg, readableError, str, updateOwned, type ActionResult } from "@/lib/forms";

const BUCKET = "documents";

/**
 * Strips everything from a filename that would make it a bad object key.
 *
 * Slashes are the dangerous ones — they would create path segments and could
 * push the file out of the organization's folder. Everything else is tidiness.
 */
function safeName(name: string) {
  return (
    name
      .replace(/[/\\]/g, "-")
      .replace(/[^\w.\- ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "file"
  );
}

/**
 * Reserves a place in storage and hands back a one-shot upload token.
 *
 * The browser uploads the bytes directly to Supabase rather than through a
 * server action, which has a body size limit measured in megabytes — small
 * enough that a set of drawings would fail. The path is built here from the
 * caller's own organization, never from anything the client sent.
 */
export async function createUploadTarget(
  owner: string | { projectId: string } | { propertyId: string },
  filename: string,
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  // A bare string is a project id, which is what every existing caller passes.
  const target =
    typeof owner === "string"
      ? { table: "projects" as const, id: owner, label: "project" }
      : "projectId" in owner
        ? { table: "projects" as const, id: owner.projectId, label: "project" }
        : { table: "properties" as const, id: owner.propertyId, label: "property" };

  // Confirms the owner is one the caller can see before a file is written
  // against it. Row level security would catch the insert later, but only after
  // the upload had already succeeded and left an orphan behind.
  const { data: row } = await caller.db
    .from(target.table)
    .select("id")
    .eq("id", target.id)
    .maybeSingle();
  if (!row) return { ok: false, error: `That ${target.label} no longer exists.` };

  const path = `${caller.orgId}/${target.id}/${crypto.randomUUID()}-${safeName(filename)}`;

  const { data, error } = await caller.db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return {
      ok: false,
      error:
        error?.message.includes("Bucket not found")
          ? "File storage is not set up yet. Run migration 0010_document_storage.sql."
          : (error?.message ?? "Could not start the upload."),
    };
  }

  return { ok: true, path: data.path, token: data.token };
}

/** Records an uploaded file. Called only after the bytes are safely in storage. */
export async function recordDocument(input: {
  /** Exactly one of these. The database refuses a row that has both or neither. */
  projectId?: string;
  propertyId?: string;
  path: string;
  name: string;
  category: string;
  sizeBytes: number;
}): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  if (Boolean(input.projectId) === Boolean(input.propertyId)) {
    return { ok: false, error: "A document belongs to either a project or a parcel." };
  }

  // The path was minted by createUploadTarget for this organization. Re-checking
  // it here stops a caller from recording someone else's file under their own row.
  if (!input.path.startsWith(`${caller.orgId}/`)) {
    return { ok: false, error: "That file does not belong to your organization." };
  }

  const { data: profile } = await caller.db
    .from("profiles")
    .select("full_name")
    .eq("id", caller.userId)
    .single();

  const { error } = await caller.db.from("documents").insert({
    org_id: caller.orgId,
    project_id: input.projectId ?? null,
    property_id: input.propertyId ?? null,
    name: input.name,
    category: input.category || "General",
    // Rounded up, so a 200-byte file reads as 1 KB rather than 0.
    size_kb: Math.max(1, Math.ceil(input.sizeBytes / 1024)),
    storage_path: input.path,
    uploaded_by: (profile as { full_name: string } | null)?.full_name ?? "",
  });

  if (error) {
    // The bytes are already in storage; leaving them there would waste space and
    // could not be reached by anything, so clean up before reporting.
    await caller.db.storage.from(BUCKET).remove([input.path]);
    return { ok: false, error: readableError(error) };
  }

  revalidatePath("/documents");
  if (input.propertyId) revalidatePath(`/development/${input.propertyId}`);
  return { ok: true };
}

/**
 * Deletes a document, bytes and row.
 *
 * The file goes first. A row left pointing at nothing is a broken download; a
 * file left with no row is invisible and unreachable, which is quieter and
 * cheaper to be wrong about.
 */
export async function deleteDocument(id: string): Promise<ActionResult> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const { data: document } = await caller.db
    .from("documents")
    .select("storage_path, property_id")
    .eq("id", id)
    .maybeSingle();
  if (!document) return { ok: false, error: "That document no longer exists." };

  const row = document as { storage_path: string | null; property_id: string | null };
  if (row.storage_path) {
    await caller.db.storage.from(BUCKET).remove([row.storage_path]);
  }

  const { error } = await caller.db.from("documents").delete().eq("id", id);
  if (error) return { ok: false, error: readableError(error) };

  revalidatePath("/documents");
  if (row.property_id) revalidatePath(`/development/${row.property_id}`);
  return { ok: true };
}

/**
 * A short-lived download link.
 *
 * Minted per click rather than rendered into the page, so a link copied out of
 * the HTML stops working within the minute and never leaves the bucket public.
 */
export async function documentDownloadUrl(
  id: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const caller = await callerOrg();
  if (!caller.ok) return caller;

  const { data: document } = await caller.db
    .from("documents")
    .select("storage_path, name")
    .eq("id", id)
    .maybeSingle();

  const path = (document as { storage_path: string | null } | null)?.storage_path;
  if (!path) return { ok: false, error: "This record has no file attached." };

  const { data, error } = await caller.db.storage
    .from(BUCKET)
    .createSignedUrl(path, 60, { download: (document as { name: string }).name });

  if (error || !data) return { ok: false, error: error?.message ?? "Could not open that file." };
  return { ok: true, url: data.signedUrl };
}

/**
 * Renaming or re-filing a document.
 *
 * The stored file is untouched — only what the row says about it changes. The
 * storage path is deliberately not editable: it is where the bytes actually
 * are, and letting a form rewrite it would point the row at a file that may not
 * exist.
 */
export async function updateDocument(data: FormData): Promise<ActionResult> {
  const name = str(data, "name");
  if (!name) return { ok: false, error: "Give the document a name." };

  return updateOwned(
    "documents",
    str(data, "id"),
    {
      name,
      category: str(data, "category") ?? "General",
      ...(str(data, "project_id") ? { project_id: str(data, "project_id") } : {}),
    },
    ["/documents"],
  );
}
