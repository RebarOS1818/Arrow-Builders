"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FilterX } from "lucide-react";

/**
 * Clears the filters that emptied the list.
 *
 * The way out of a filtered-empty screen belongs on the screen itself. Leaving
 * someone to remember which of three dropdowns they changed is how a list that
 * looks broken stays looking broken — and the filters live in the query string,
 * so the fix is one navigation.
 */
export function ClearFilters({ params }: { params: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = new URLSearchParams(searchParams.toString());
  for (const key of params) next.delete(key);
  const active = next.toString() !== searchParams.toString();

  // Nothing set means nothing to clear: a button that would do nothing is worse
  // than no button, because pressing it looks like a bug.
  if (!active) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const query = next.toString();
        router.push(query ? `?${query}` : "?", { scroll: false });
      }}
      className="pressable inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-soft hover:shadow-lift"
    >
      <FilterX className="size-4" />
      Clear filters
    </button>
  );
}
