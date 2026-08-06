"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Paperclip, Plus, Trash2, Upload } from "lucide-react";
import {
  createUploadTarget,
  deleteDocument,
  recordDocument,
} from "@/app/(app)/documents/actions";
import { DocumentLink } from "@/components/documents/document-link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { MAX_UPLOAD_BYTES, PARCEL_DRAWINGS } from "@/lib/uploads";
import { formatDate } from "@/lib/utils";
import type { DocumentRecord } from "@/lib/types";

/**
 * The drawings a parcel is assessed from, as named slots.
 *
 * A single "Documents" list would be the easy version and the wrong one: the
 * survey, plot plan, site plan and sketch are four specific things you either
 * have or are waiting on, and the question people ask this screen is "which of
 * these is still missing". A flat list answers that only by making you read it
 * and remember what should have been there. Four labelled slots answer it at a
 * glance, and an empty slot is a visible gap rather than an absence.
 *
 * Each slot holds more than one file, because a survey arrives, then arrives
 * again revised, and overwriting the first one loses the thing you would want
 * when the two disagree.
 *
 * Anything else filed against the parcel falls through to the list underneath,
 * so the named slots stay meaningful rather than becoming a taxonomy nobody
 * fits their file into.
 */
export function ParcelFiles({
  propertyId,
  documents,
}: {
  propertyId: string;
  documents: DocumentRecord[];
}) {
  const slots = PARCEL_DRAWINGS.map((category) => ({
    category,
    files: documents.filter((d) => d.category === category),
  }));
  const other = documents.filter(
    (d) => !PARCEL_DRAWINGS.includes(d.category as (typeof PARCEL_DRAWINGS)[number]),
  );

  return (
    <div className="space-y-3">
      {!isSupabaseConfigured && (
        <p className="text-sm text-ink-subtle">
          Connect Supabase to upload files.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {slots.map((slot) => (
          <Slot
            key={slot.category}
            propertyId={propertyId}
            category={slot.category}
            files={slot.files}
          />
        ))}
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Paperclip className="size-4 text-ink-subtle" />
            Other documents
          </h3>
          <UploadButton propertyId={propertyId} category="General" label="Add" />
        </div>
        {other.length === 0 ? (
          <p className="mt-2 text-sm text-ink-subtle">
            Title reports, correspondence, anything that is not one of the four
            drawings.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {other.map((file) => (
              <FileRow key={file.id} file={file} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Slot({
  propertyId,
  category,
  files,
}: {
  propertyId: string;
  category: string;
  files: DocumentRecord[];
}) {
  const empty = files.length === 0;

  return (
    <div
      className={
        empty
          ? "rounded-card border border-dashed border-line-strong p-4"
          : "card p-4"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <span
            className={`icon-tile size-8 ${
              empty ? "bg-canvas text-ink-subtle" : "bg-brand-50 text-brand-700"
            }`}
          >
            <FileText className="size-4" />
          </span>
          {category}
        </h3>
        <UploadButton
          propertyId={propertyId}
          category={category}
          // The second file onto a slot is a revision, not a first upload, and
          // saying so is what stops someone assuming they have overwritten it.
          label={empty ? "Upload" : "Add revision"}
        />
      </div>

      {empty ? (
        <p className="mt-2 text-sm text-ink-subtle">Not received yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {files.map((file) => (
            <FileRow key={file.id} file={file} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FileRow({ file }: { file: DocumentRecord }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function remove() {
    // Deleting a drawing removes the bytes, so it asks. Everything else on this
    // page is recoverable by re-entering it; this is not.
    if (!confirm(`Delete "${file.name}"? The file itself is removed too.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteDocument(file.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <li className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <DocumentLink id={file.id} name={file.name} hasFile={Boolean(file.storage_path)} />
        <p className="text-xs text-ink-subtle">
          {formatDate(file.uploaded_at)}
          {file.uploaded_by && ` · ${file.uploaded_by}`}
          {file.size_kb > 0 &&
            ` · ${file.size_kb >= 1024 ? `${(file.size_kb / 1024).toFixed(1)} MB` : `${file.size_kb} KB`}`}
        </p>
        {error && <p className="mt-0.5 text-xs text-status-risk">{error}</p>}
      </div>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label={`Delete ${file.name}`}
        className="pressable grid size-9 shrink-0 place-items-center rounded-full text-ink-subtle hover:bg-rose-50 hover:text-status-risk disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      </button>
    </li>
  );
}

/**
 * Upload into one known slot.
 *
 * No dialog: the category is already decided by which slot was pressed and the
 * parcel by which page you are on, so the only thing left to ask is the file
 * itself — and a modal that asks one question the OS is about to ask anyway is
 * a step for nothing. The button opens the file picker directly and the upload
 * starts on selection.
 */
function UploadButton({
  propertyId,
  category,
  label,
}: {
  propertyId: string;
  category: string;
  label: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared straight away so picking the same file twice still fires a change.
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Larger than the ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit.`);
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const target = await createUploadTarget({ propertyId }, file.name);
      if (!target.ok) return setError(target.error);

      const { error: uploadError } = await createClient()
        .storage.from("documents")
        .uploadToSignedUrl(target.path, target.token, file);
      if (uploadError) return setError(uploadError.message);

      const recorded = await recordDocument({
        propertyId,
        path: target.path,
        name: file.name,
        category,
        sizeBytes: file.size,
      });
      if (!recorded.ok) return setError(recorded.error);

      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  // Said once for the whole section, not five times over. The same sentence
  // repeated beside every slot reads as five separate faults.
  if (!isSupabaseConfigured) return null;

  return (
    <>
      <input ref={input} type="file" onChange={onPick} className="hidden" />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="pressable inline-flex min-h-9 items-center gap-1.5 rounded-full bg-canvas px-3 text-xs font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : label === "Upload" ? (
          <Upload className="size-3.5" />
        ) : (
          <Plus className="size-3.5" />
        )}
        {busy ? "Uploading…" : label}
      </button>
      {error && <p className="w-full text-xs text-status-risk">{error}</p>}
    </>
  );
}
