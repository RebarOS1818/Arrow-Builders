"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";
import { createUploadTarget, recordDocument } from "@/app/(app)/documents/actions";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DOCUMENT_CATEGORIES, MAX_UPLOAD_BYTES } from "@/lib/uploads";

/**
 * Uploads a file to storage, then records it.
 *
 * Three steps, in this order for a reason: the server mints a path inside the
 * caller's organization, the browser sends the bytes straight to Supabase
 * (server actions cap request bodies well below the size of a drawing set), and
 * only once the bytes have landed does a row appear. A row pointing at a file
 * that failed to upload would be worse than no row at all.
 */
export function UploadDocument({ projects }: { projects: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [category, setCategory] = useState<string>(DOCUMENT_CATEGORIES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      // Escape during an upload would leave the bytes in flight with nothing
      // listening for the result.
      if (event.key === "Escape" && !busy) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("input, select")?.focus();

    const trigger = triggerRef.current;
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open, busy]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !projectId) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`That file is larger than the ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit.`);
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const target = await createUploadTarget(projectId, file.name);
      if (!target.ok) {
        setError(target.error);
        return;
      }

      const { error: uploadError } = await createClient()
        .storage.from("documents")
        .uploadToSignedUrl(target.path, target.token, file);
      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const recorded = await recordDocument({
        projectId,
        path: target.path,
        name: file.name,
        category,
        sizeBytes: file.size,
      });
      if (!recorded.ok) {
        setError(recorded.error);
        return;
      }

      setOpen(false);
      setFile(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  // Without Supabase there is nowhere for the bytes to go. Saying so on the
  // button beats a modal that fails at the last step.
  const unavailable = !isSupabaseConfigured
    ? "Connect Supabase to upload files"
    : projects.length === 0
      ? "Create a project first"
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        disabled={unavailable !== null}
        className="pressable flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Upload className="size-4" />
        Upload
      </button>
      {unavailable && <p className="w-full text-xs text-ink-subtle sm:w-auto">{unavailable}</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => !busy && setOpen(false)}
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
          />

          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Upload a document"
            className="relative w-full rounded-t-[2rem] bg-surface p-6 shadow-material sm:max-w-lg sm:rounded-[2rem]"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight">Upload a document</h2>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                aria-label="Close"
                className="grid size-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-canvas hover:text-ink"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium">
                  File<span className="text-status-risk"> *</span>
                </span>
                <input
                  type="file"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-1.5 w-full rounded-tile bg-canvas px-3.5 py-2.5 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
                <span className="mt-1 block text-xs text-ink-subtle">
                  Up to {MAX_UPLOAD_BYTES / 1024 / 1024} MB.
                </span>
              </label>

              <label className="block">
                <span className="text-sm font-medium">
                  Project<span className="text-status-risk"> *</span>
                </span>
                <select
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="mt-1.5 w-full rounded-tile bg-canvas px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium">Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-tile bg-canvas px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
                >
                  {DOCUMENT_CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              {error && (
                <p className="rounded-tile bg-rose-50 p-3 text-sm text-status-risk">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="pressable rounded-full px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-canvas disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !file}
                  className="pressable inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {busy ? "Uploading…" : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
