"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { AddressField } from "./address-field";
import { cn } from "@/lib/utils";

export type FieldType =
  | "hidden"
  | "address"
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "date"
  | "select"
  | "checkbox";

export type Field = {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Explains a rule the database will enforce anyway, before it bites. */
  hint?: string;
  defaultValue?: string;
  /** Columns to span in the two-column grid. */
  wide?: boolean;
  step?: string;
  /** For "address": which sibling inputs a chosen suggestion should fill. */
  fills?: { city?: string; state?: string; postalCode?: string };
};

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * A record form in a modal.
 *
 * One component rather than eleven near-identical ones. The fields are data, the
 * submit is a server action, and every form gets the same error handling and
 * focus behaviour for free — which is what stops the eleventh form being the one
 * where the error message was forgotten.
 */
export function RecordForm({
  title,
  description,
  submitLabel = "Save",
  triggerLabel,
  fields,
  action,
  disabled,
  disabledReason,
  edit,
}: {
  title: string;
  description?: string;
  submitLabel?: string;
  triggerLabel: string;
  fields: Field[];
  action: (data: FormData) => Promise<ActionResult>;
  disabled?: boolean;
  disabledReason?: string;
  /** Editing an existing record rather than adding one. Changes the icon only. */
  edit?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the first *visible* field: hidden inputs come first in the DOM and
    // focusing one would leave the dialog with no apparent focus at all.
    dialogRef.current
      ?.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select")
      ?.focus();

    // Captured now rather than read in the cleanup, where the ref may already
    // point somewhere else.
    const trigger = triggerRef.current;

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Focus returns to what opened the dialog, not to the top of the page.
      trigger?.focus();
    };
  }, [open]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await action(data);
      if (result.ok) {
        setOpen(false);
        // The list is a server component, so a refresh is what shows the new row.
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          ref={triggerRef}
          type="button"
          // Marked so an enclosing row can open this form without the row
          // itself having to be a control. See OpenOnClick.
          data-record-trigger=""
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="pressable inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {edit ? <Pencil className="size-3.5" /> : <Plus className="size-4" />}
          {triggerLabel}
        </button>
        {/* Written out rather than left to a `title`: a disabled button swallows
            the events a tooltip needs, so the explanation would never appear
            and the button would just look broken. */}
        {disabled && disabledReason && (
          <span className="text-xs text-ink-subtle">{disabledReason}</span>
        )}
      </span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
          />

          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-surface p-6 shadow-material sm:max-w-2xl sm:rounded-[2rem]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                {description && (
                  <p className="mt-1 text-sm text-ink-muted">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid size-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-canvas hover:text-ink"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                  <FieldInput key={field.name} field={field} />
                ))}
              </div>

              {error && (
                <p className="mt-4 rounded-tile bg-rose-50 p-3 text-sm text-status-risk">
                  {error}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="pressable rounded-full px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="pressable inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  {submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-tile bg-canvas px-3.5 py-2.5 text-sm outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-brand-200";

function FieldInput({ field }: { field: Field }) {
  const { name, label, type = "text", required, placeholder, options, hint, defaultValue } = field;

  // Carried through the form without occupying a grid cell — a labelless text
  // input would otherwise render as a blank field the user could type into.
  if (type === "hidden") {
    return <input type="hidden" name={name} value={defaultValue ?? ""} readOnly />;
  }

  if (type === "address") {
    return (
      <AddressField
        name={name}
        label={label}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        fills={field.fills}
        className={cn("block", field.wide && "sm:col-span-2")}
      />
    );
  }

  if (type === "checkbox") {
    return (
      <label className={cn("flex items-center gap-2.5 text-sm", field.wide && "sm:col-span-2")}>
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultValue === "true"}
          className="size-4 rounded border-line-strong text-brand-600 focus:ring-brand-200"
        />
        <span className="font-medium">{label}</span>
      </label>
    );
  }

  return (
    <label className={cn("block", (field.wide || type === "textarea") && "sm:col-span-2")}>
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-status-risk"> *</span>}
      </span>

      {type === "textarea" ? (
        <textarea
          name={name}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          rows={3}
          className={inputClass}
        />
      ) : type === "select" ? (
        <select name={name} required={required} defaultValue={defaultValue} className={inputClass}>
          {!required && <option value="">—</option>}
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type === "money" || type === "number" ? "number" : type}
          // Money is entered in whole currency units; the action converts.
          step={field.step ?? (type === "money" ? "0.01" : type === "number" ? "1" : undefined)}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={inputClass}
        />
      )}

      {hint && <span className="mt-1 block text-xs text-ink-subtle">{hint}</span>}
    </label>
  );
}
