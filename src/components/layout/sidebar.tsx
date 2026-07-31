"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FileText,
  Hammer,
  HardHat,
  Landmark,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PieChart,
  Settings,
  Stamp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const OVERVIEW = [
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

export function Sidebar({
  ref,
  crew,
  open = false,
  dragging = false,
  onClose,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  ref?: React.Ref<HTMLElement>;
  crew: { id: string; full_name: string; initials: string; role: string }[];
  open?: boolean;
  dragging?: boolean;
  onClose?: () => void;
  onPointerDown?: (event: React.PointerEvent) => void;
  onPointerMove?: (event: React.PointerEvent) => void;
  onPointerUp?: (event: React.PointerEvent) => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    /* Off-canvas below lg; `invisible` when closed keeps the links out of the tab
       order. The lg: overrides pin it back as an ordinary static column. */
    <aside
      ref={ref}
      id="app-sidebar"
      aria-label="Main navigation"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      /* Position is written straight to style by the spring, so no transition
         here — a transition would fight the frame-by-frame updates and make the
         drawer impossible to grab mid-flight. `touch-none` stops the browser
         claiming the horizontal drag for its own scroll gesture. */
      className={cn(
        "sidebar-surface fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 touch-none flex-col overflow-y-auto px-4 py-5 lg:hidden",
        open ? "visible shadow-material" : "invisible",
        dragging && "select-none",
      )}
    >
      <div className="mb-7 flex items-center justify-between gap-2 px-2">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-brand-600 text-white">
            <HardHat className="size-4.5" />
          </span>
          <span className="whitespace-nowrap text-base font-semibold tracking-tight lg:text-lg">
            Arrow Builders
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="-mr-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-canvas hover:text-ink lg:hidden"
        >
          <X className="size-4.5" />
        </button>
      </div>

      <SectionLabel>Overview</SectionLabel>
      <nav className="mt-1 space-y-0.5">
        {OVERVIEW.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-tile px-3 py-2.5 text-sm transition-colors",
              isActive(item.href)
                ? "bg-brand-50 font-semibold text-brand-700"
                : "font-medium text-ink-muted hover:bg-canvas hover:text-ink",
            )}
          >
            <item.icon className="size-4.5 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      {crew.length > 0 && (
        <>
          <SectionLabel className="mt-7">On site today</SectionLabel>
          <ul className="mt-2 space-y-1">
            {crew.slice(0, 3).map((member) => (
              <li key={member.id} className="flex items-center gap-2.5 rounded-tile px-3 py-2">
                <Avatar name={member.full_name} initials={member.initials} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium leading-tight">
                    {member.full_name}
                  </p>
                  <p className="truncate text-xs text-ink-subtle">{member.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-auto pt-7">
        <SectionLabel>Settings</SectionLabel>
        <nav className="mt-1 space-y-0.5">
          <Link
            href="/billing"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-tile px-3 py-2.5 text-sm transition-colors",
              isActive("/billing")
                ? "bg-brand-50 font-semibold text-brand-700"
                : "font-medium text-ink-muted hover:bg-canvas hover:text-ink",
            )}
          >
            <Wallet className="size-4.5" />
            Billing
          </Link>
          <Link
            href="/settings"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-tile px-3 py-2.5 text-sm transition-colors",
              isActive("/settings")
                ? "bg-brand-50 font-semibold text-brand-700"
                : "font-medium text-ink-muted hover:bg-canvas hover:text-ink",
            )}
          >
            <Settings className="size-4.5" />
            Setting
          </Link>
          <Link
            href="/settings#sign-out"
            onClick={onClose}
            className="flex items-center gap-3 rounded-tile px-3 py-2.5 text-sm font-medium text-status-risk transition-colors hover:bg-rose-50"
          >
            <LogOut className="size-4.5" />
            Logout
          </Link>
        </nav>
      </div>
    </aside>
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle",
        className,
      )}
    >
      {children}
    </p>
  );
}
