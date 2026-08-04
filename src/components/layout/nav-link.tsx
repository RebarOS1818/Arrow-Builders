"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-items";

/**
 * One destination, as a pill with the icon in its own tile.
 *
 * The active state is carried by the tile filling with brand navy and the pill
 * turning white and lifting — two signals, not one. A colour change alone is
 * the first thing lost to a bad screen in daylight, which is the condition this
 * gets used in.
 */
export function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 text-sm transition-all",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        active
          ? "bg-surface font-semibold text-ink shadow-soft"
          : "font-medium text-ink-muted hover:bg-white/60 hover:text-ink",
      )}
    >
      <span
        className={cn(
          "icon-tile size-9 transition-colors",
          active
            ? "bg-brand-700 text-white"
            : "bg-white/70 text-ink-subtle group-hover:text-brand-700",
        )}
      >
        <item.icon className="size-4.5" />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
