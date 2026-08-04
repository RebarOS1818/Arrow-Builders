"use client";

import Link from "next/link";
import { Bell, HardHat, Menu, Search } from "lucide-react";
import { ProfileMenu } from "@/components/layout/profile-menu";

/**
 * The row above the page.
 *
 * It used to carry the destinations too, scrolling ten of them sideways behind
 * a fade. The rail owns navigation now, so this is left with the things that
 * act on wherever you already are — find something, see what needs attention,
 * be someone. That is a row that can breathe rather than one competing with
 * itself for width.
 *
 * It deliberately does not name the page. Every page already opens with its own
 * heading, carrying the counts and context a bare route label cannot, and the
 * rail's active pill says where you are — a third copy would be noise in the
 * one row that should stay calm.
 */
export function TopNav({
  user,
  onMenu,
  menuOpen = false,
  menuButtonRef,
}: {
  user: { full_name: string; initials: string; role: string };
  onMenu?: () => void;
  menuOpen?: boolean;
  menuButtonRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <header className="flex items-center gap-2.5 pb-5">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        aria-controls="app-sidebar"
        aria-expanded={menuOpen}
        className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-surface text-ink-muted shadow-soft hover:text-ink lg:hidden"
      >
        <Menu className="size-4.5" />
      </button>

      {/* The wordmark belongs to the rail on desktop; below lg the rail is gone,
          so it appears here instead rather than leaving the row unbranded. */}
      <Link href="/" className="flex shrink-0 items-center gap-2.5 lg:hidden">
        <span className="icon-tile size-9 bg-brand-700 text-white">
          <HardHat className="size-4.5" />
        </span>
        <span className="hidden whitespace-nowrap font-semibold tracking-tight sm:block">
          Arrow Builders
        </span>
      </Link>

      {/* Takes the width the navigation used to occupy rather than being pinned
          to the right edge with a corridor of nothing beside it. A search field
          people are meant to use should look like the row's main event. */}
      <label className="relative hidden min-w-0 max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-ink-subtle" />
        <input
          type="search"
          placeholder="Search…"
          aria-label="Search"
          className="w-full rounded-full bg-surface py-3 pl-11 pr-4 text-sm shadow-soft outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Link
          href="/approvals"
          aria-label="Notifications"
          className="pressable relative grid size-11 place-items-center rounded-full bg-surface text-ink-muted shadow-soft hover:text-ink"
        >
          <Bell className="size-4.5" />
          <span className="absolute right-3 top-3 size-2 rounded-full bg-accent-500 ring-2 ring-surface" />
        </Link>
        <ProfileMenu name={user.full_name} initials={user.initials} role={user.role} />
      </div>
    </header>
  );
}
