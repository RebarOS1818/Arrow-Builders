"use client";

import Link from "next/link";
import { Bell, Mail, Menu, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export function AppHeader({
  user,
  unread = true,
  onMenu,
  menuOpen = false,
  menuButtonRef,
}: {
  user: { full_name: string; initials: string };
  unread?: boolean;
  onMenu?: () => void;
  menuOpen?: boolean;
  menuButtonRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <header className="flex items-center gap-3 pb-5">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        aria-controls="app-sidebar"
        aria-expanded={menuOpen}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink-muted shadow-soft hover:text-ink lg:hidden"
      >
        <Menu className="size-4.5" />
      </button>

      <label className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-ink-subtle" />
        <input
          type="search"
          placeholder="Search projects, tasks, documents…"
          aria-label="Search"
          className="w-full rounded-full bg-surface py-3 pl-11 pr-4 text-sm shadow-soft outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <div className="flex shrink-0 items-center gap-2">
        <IconButton label="Messages" href="/approvals">
          <Mail className="size-4.5" />
        </IconButton>
        <IconButton label="Notifications" href="/approvals" dot={unread}>
          <Bell className="size-4.5" />
        </IconButton>

        <span className="mx-1 hidden h-8 w-px bg-line sm:block" />

        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-full pl-0.5 pr-1 sm:pr-2"
        >
          <Avatar name={user.full_name} initials={user.initials} size="lg" />
          <span className="hidden text-sm font-semibold sm:block">{user.full_name}</span>
        </Link>
      </div>
    </header>
  );
}

function IconButton({
  children,
  label,
  href,
  dot,
}: {
  children: React.ReactNode;
  label: string;
  href: string;
  dot?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative grid size-10 place-items-center rounded-full bg-surface text-ink-muted shadow-soft transition-colors hover:text-ink"
    >
      {children}
      {dot && (
        <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-brand-600 ring-2 ring-surface" />
      )}
    </Link>
  );
}
