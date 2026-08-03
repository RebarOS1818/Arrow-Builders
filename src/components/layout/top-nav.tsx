"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  FileText,
  Hammer,
  HardHat,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Menu,
  PieChart,
  Search,
  Settings,
  Stamp,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/development", label: "Development", icon: Landmark },
  { href: "/construction", label: "Construction", icon: Hammer },
  { href: "/projects", label: "Projects", icon: HardHat },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/approvals", label: "Approvals", icon: Stamp },
  { href: "/reports", label: "Reports", icon: PieChart },
  { href: "/teams", label: "Teams", icon: Users },
];

/**
 * Horizontal navigation, as in the reference.
 *
 * Eight destinations is more than the reference's five, so from `lg` the links
 * scroll horizontally rather than wrapping to a second row or shrinking below a
 * comfortable tap size. Below `lg` this collapses to the menu button and the
 * drawer takes over.
 */
export function TopNav({
  user,
  onMenu,
  menuOpen = false,
  menuButtonRef,
}: {
  user: { full_name: string; initials: string };
  onMenu?: () => void;
  menuOpen?: boolean;
  menuButtonRef?: React.Ref<HTMLButtonElement>;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="flex items-center gap-3 pb-6">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        aria-controls="app-sidebar"
        aria-expanded={menuOpen}
        className="pressable grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink-muted shadow-soft hover:text-ink lg:hidden"
      >
        <Menu className="size-4.5" />
      </button>

      <Link href="/" className="flex shrink-0 items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-brand-700 text-white">
          <HardHat className="size-5" />
        </span>
        <span className="hidden whitespace-nowrap text-lg font-semibold tracking-tight sm:block">
          Arrow Builders
        </span>
      </Link>

      {/*
        The links get the row before the search box does: a half-visible
        destination reads as broken, whereas a search field appearing only on
        wide screens reads as a deliberate progressive enhancement. The mask
        fades the scroll edge so it is clear there is more, rather than looking
        like a clipped layout.
      */}
      <nav
        className="scroll-hidden hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-3 lg:flex"
        style={{
          maskImage: "linear-gradient(to right, black calc(100% - 24px), transparent)",
        }}
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-2 text-sm transition-colors",
              isActive(item.href)
                ? "bg-surface font-semibold text-ink shadow-soft"
                : "font-medium text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <label className="relative ml-auto hidden max-w-64 shrink md:block lg:ml-0 lg:hidden 2xl:block">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-ink-subtle" />
        <input
          type="search"
          placeholder="Search…"
          aria-label="Search"
          className="w-full rounded-full bg-surface py-2.5 pl-11 pr-4 text-sm shadow-soft outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
        <Link
          href="/approvals"
          aria-label="Notifications"
          className="pressable relative grid size-10 place-items-center rounded-full bg-surface text-ink-muted shadow-soft hover:text-ink"
        >
          <Bell className="size-4.5" />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-mint-500 ring-2 ring-surface" />
        </Link>
        <Link
          href="/settings"
          aria-label="Settings"
          className="pressable hidden size-10 place-items-center rounded-full bg-surface text-ink-muted shadow-soft hover:text-ink sm:grid"
        >
          <Settings className="size-4.5" />
        </Link>
        <Link href="/settings" className="pressable shrink-0 rounded-full">
          <Avatar name={user.full_name} initials={user.initials} size="lg" />
        </Link>
      </div>
    </header>
  );
}
