"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, House, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/tasks", label: "Tasks" },
  { href: "/schedule", label: "Schedule" },
  { href: "/documents", label: "Documents" },
  { href: "/teams", label: "Teams" },
  { href: "/reports", label: "Reports" },
];

export function TopNav({ user }: { user: { full_name: string; initials: string } }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Home"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-canvas hover:text-ink"
        >
          <House className="size-[18px]" />
        </Link>

        <nav className="scroll-thin flex flex-1 items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "text-brand-700"
                  : "text-ink-muted hover:bg-canvas hover:text-ink",
              )}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-brand-600" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Notifications"
            className="relative grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <Bell className="size-[18px]" />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-status-behind ring-2 ring-surface" />
          </button>
          <Link
            href="/settings"
            aria-label="Settings"
            className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <Settings className="size-[18px]" />
          </Link>
          <Link
            href="/settings"
            className="ml-1 flex items-center gap-1 rounded-full py-1 pl-1 pr-2 hover:bg-canvas"
          >
            <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
              {user.initials}
            </span>
            <ChevronDown className="size-4 text-ink-subtle" />
          </Link>
        </div>
      </div>
    </header>
  );
}
