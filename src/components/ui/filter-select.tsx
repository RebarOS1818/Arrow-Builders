"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Select that writes its value to a query param so server components can read it. */
export function FilterSelect({
  param,
  options,
  defaultValue = "all",
  className,
  ariaLabel,
}: {
  param: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  className?: string;
  ariaLabel: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get(param) ?? defaultValue;

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === defaultValue) params.delete(param);
    else params.set(param, next);
    const query = params.toString();
    router.push(query ? `?${query}` : "?", { scroll: false });
  }

  return (
    <div className={cn("relative", className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-line bg-surface py-2 pl-3 pr-8 text-sm font-medium text-ink shadow-xs outline-none hover:border-line-strong focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
    </div>
  );
}
