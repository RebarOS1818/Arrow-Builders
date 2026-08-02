"use client";

import { useState, useTransition } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { documentDownloadUrl } from "@/app/(app)/documents/actions";

/**
 * Opens a document.
 *
 * The signed URL is fetched on click rather than rendered into the page: a link
 * sitting in the HTML would be a working, credential-free handle on a private
 * file for anyone who viewed source or shared a screenshot of the DOM.
 */
export function DocumentLink({
  id,
  name,
  hasFile,
}: {
  id: string;
  name: string;
  hasFile: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!hasFile) {
    return (
      <span className="flex items-center gap-2 font-medium text-ink-muted">
        <FileText className="size-4 shrink-0 text-ink-subtle" />
        {name}
        <span className="text-xs font-normal text-ink-subtle">no file</span>
      </span>
    );
  }

  function open() {
    setError(null);
    startTransition(async () => {
      const result = await documentDownloadUrl(id);
      if (result.ok) window.open(result.url, "_blank", "noopener,noreferrer");
      else setError(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="group flex items-center gap-2 text-left font-medium hover:text-brand-700 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-ink-subtle" />
        ) : (
          <FileText className="size-4 shrink-0 text-ink-subtle" />
        )}
        {name}
        <Download className="size-3.5 shrink-0 text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
      {error && <p className="mt-0.5 text-xs text-status-risk">{error}</p>}
    </>
  );
}
