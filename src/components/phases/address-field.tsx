"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import type { Diagnostic, PlaceDetail, Suggestion } from "@/app/api/places/route";

/**
 * An address input that suggests real addresses as you type.
 *
 * Picking a suggestion fills the sibling city, state and postcode inputs and
 * records the coordinates, so a saved parcel points at an exact spot rather than
 * at whatever a text search later guesses from a typo.
 *
 * Typed text is always kept. Autocomplete is an accelerator, never a gate: rural
 * parcels, new subdivisions and unaddressed land often have no match at all, and
 * a field that refused them would be useless to a developer buying raw land.
 */
export function AddressField({
  name,
  label,
  required,
  placeholder,
  defaultValue,
  /** Names of the inputs in the same form to fill from the chosen place. */
  fills = { city: "city", state: "state" },
  className,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  fills?: { city?: string; state?: string; postalCode?: string };
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  // Null until the first lookup answers; false disables the feature for good in
  // this session, so an unconfigured deployment does not retry on every keypress.
  const [available, setAvailable] = useState<boolean | null>(null);
  // Why it is off, when the server can say. Shown rather than logged, because
  // the person who can fix it is the one looking at this form.
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Google bills an autocomplete session — every keystroke plus the selection —
  // as one event, but only when the same token is sent throughout.
  const sessionToken = useRef<string>(crypto.randomUUID());
  // The text this field wrote itself after a selection. Without it, filling the
  // input from a chosen place looks like typing, and the effect below would
  // immediately search for the address the user just picked.
  const chosen = useRef<string | null>(null);
  const listId = useId();

  // Debounced lookup. The timer is cleared on every change, so a fast typist
  // costs one request rather than one per character.
  useEffect(() => {
    if (available === false) return;
    if (chosen.current === value) return;
    const query = value.trim();
    // Below three characters there is nothing worth asking Google about. The
    // stale list is not cleared here — the render guard below hides it, which
    // keeps this effect free of synchronous state writes.
    if (query.length < 3) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const response = await fetch("/api/places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: query, sessionToken: sessionToken.current }),
        });

        if (response.status === 501 || response.status === 503) {
          if (cancelled) return;
          setAvailable(false);
          const body = (await response.json().catch(() => null)) as {
            diagnostic?: Diagnostic;
          } | null;
          if (body?.diagnostic) setDiagnostic(body.diagnostic);
          return;
        }
        if (!response.ok) return;

        const data = (await response.json()) as { suggestions?: Suggestion[] };
        if (cancelled) return;
        setAvailable(true);
        setSuggestions(data.suggestions ?? []);
        setActive(-1);
        setOpen((data.suggestions ?? []).length > 0);
      } catch {
        // A failed lookup leaves the typed text alone, which is the whole point.
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, available]);

  // Clicking away closes the list without choosing anything.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function fill(inputName: string | undefined, text: string) {
    if (!inputName || !text) return;
    const form = inputRef.current?.form;
    const field = form?.elements.namedItem(inputName);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
      field.value = text;
    }
  }

  async function choose(suggestion: Suggestion) {
    setOpen(false);
    setSuggestions([]);
    setActive(-1);
    setBusy(true);
    // Shown immediately so the field never looks unresponsive while the details
    // request is in flight.
    const interim = [suggestion.primary, suggestion.secondary].filter(Boolean).join(", ");
    chosen.current = interim;
    setValue(interim);

    try {
      const response = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: suggestion.id, sessionToken: sessionToken.current }),
      });
      if (!response.ok) return;

      const { detail } = (await response.json()) as { detail: PlaceDetail };
      // The street line alone; city and state go to their own fields rather than
      // being repeated inside the address.
      const settled = detail.address || suggestion.primary;
      chosen.current = settled;
      setValue(settled);
      fill(fills.city, detail.city);
      fill(fills.state, detail.state);
      fill(fills.postalCode, detail.postalCode);
      setLat(detail.latitude === null ? "" : String(detail.latitude));
      setLng(detail.longitude === null ? "" : String(detail.longitude));
    } catch {
      // Keep what was shown.
    } finally {
      setBusy(false);
      // A new session begins after a selection; reusing the token would bill the
      // next search against a closed one.
      sessionToken.current = crypto.randomUUID();
      inputRef.current?.focus();
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter" && active >= 0) {
      // Only swallowed when a suggestion is highlighted, so Enter still submits
      // the form for anyone typing an address the list does not know.
      event.preventDefault();
      void choose(suggestions[active]!);
    } else if (event.key === "Escape") {
      event.preventDefault();
      // The dialog closes on Escape from a document listener. Without this, one
      // press to dismiss the suggestions would throw away the whole form.
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      setOpen(false);
    }
  }

  // Suggestions belong to the text that fetched them, so a query trimmed back
  // below the threshold hides them rather than showing results for older input.
  const showList = open && value.trim().length >= 3 && suggestions.length > 0;

  return (
    <label className={className} ref={rootRef as React.Ref<HTMLLabelElement>}>
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-status-risk"> *</span>}
      </span>

      <div className="relative">
        <input
          ref={inputRef}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            // Real typing, so the guard against re-searching a chosen address
            // no longer applies — and the coordinates go with it. Keeping them
            // would save the new address at the old address's location, which
            // is worse than having no coordinates at all.
            chosen.current = null;
            setLat("");
            setLng("");
            setValue(e.target.value);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          className="mt-1.5 w-full rounded-tile bg-canvas px-3.5 py-2.5 pr-9 text-sm outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-brand-200"
        />
        {busy && (
          <Loader2 className="absolute right-3 top-1/2 mt-0.5 size-4 -translate-y-1/2 animate-spin text-ink-subtle" />
        )}

        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-tile bg-surface p-1 shadow-material"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onPointerDown={(e) => {
                  // Before blur, or the list would close under the pointer.
                  e.preventDefault();
                  void choose(suggestion);
                }}
                onMouseEnter={() => setActive(index)}
                className={`flex cursor-pointer items-start gap-2 rounded-[10px] px-3 py-2 text-sm ${
                  index === active ? "bg-canvas" : ""
                }`}
              >
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-subtle" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{suggestion.primary}</span>
                  {suggestion.secondary && (
                    <span className="block truncate text-xs text-ink-subtle">
                      {suggestion.secondary}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <span className="mt-1 block text-xs text-ink-subtle">
        {available === false
          ? "Type the address. Suggestions are off until a Google Maps key is set."
          : "Start typing, then pick a suggestion to fill city, state and coordinates."}
      </span>

      {diagnostic && (
        <span className="mt-1 block text-xs text-ink-subtle">
          <code className="font-mono">GOOGLE_MAPS_API_KEY</code>{" "}
          {diagnostic.key === "empty"
            ? "is defined on this deployment but its value is empty."
            : "is not defined on this deployment."}{" "}
          Environment <b>{diagnostic.environment}</b>, build <b>{diagnostic.build}</b>.{" "}
          {diagnostic.relatedNames.length === 0
            ? "No related variable is set on it at all."
            : `Related names present: ${diagnostic.relatedNames.join(", ")}.`}
        </span>
      )}

      {/* Only present when a suggestion was chosen; a typed address saves with
          null coordinates rather than a guess. */}
      <input type="hidden" name={`${name}_latitude`} value={lat} readOnly />
      <input type="hidden" name={`${name}_longitude`} value={lng} readOnly />
    </label>
  );
}
