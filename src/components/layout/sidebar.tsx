"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ArrowMark } from "@/components/brand/arrow-mark";
import { NavLink } from "@/components/layout/nav-link";
import { ACCOUNT, WORK, isActiveHref } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

/**
 * Navigation below `lg`, as a drag-tracking drawer.
 *
 * Visually the rail, so moving between a phone and a laptop is not learning the
 * app twice — same pills, same icon tiles, same active state. It carries the
 * sign-out and on-site rows the rail leaves to the profile menu, because there
 * is no profile menu wide enough for them on a phone.
 */
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

  return (
    /* Off-canvas below lg; `invisible` when closed keeps the links out of the
       tab order.

       Position is written straight to style by the spring, so no transition
       here — one would fight the frame-by-frame updates and make the drawer
       impossible to grab mid-flight.

       `touch-pan-y`, not `touch-none`: none stops the browser claiming the
       horizontal drag, but it also stops it scrolling, so the items below the
       fold could not be reached at all. pan-y keeps vertical scrolling and
       still leaves the horizontal gesture to the drawer.

       The bottom padding clears the home indicator and the browser's own
       toolbar, which overlap a fixed element pinned to inset-y-0. */
    <aside
      ref={ref}
      id="app-sidebar"
      aria-label="Main navigation"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "sidebar-surface fixed inset-y-0 left-0 z-50 flex w-[16.5rem] shrink-0 touch-pan-y flex-col overflow-y-auto overscroll-contain px-3 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))] lg:hidden",
        open ? "visible shadow-material" : "invisible",
        dragging && "select-none",
      )}
    >
      <div className="mb-6 flex items-center justify-between gap-2 pl-1.5">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
          <span className="icon-tile size-10 bg-brand-700 text-accent-500">
            <ArrowMark className="w-5" />
          </span>
          <span className="whitespace-nowrap font-semibold tracking-tight">
            Arrow Builders
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="grid size-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-canvas hover:text-ink"
        >
          <X className="size-4.5" />
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        {WORK.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActiveHref(pathname, item.href)}
            onNavigate={onClose}
          />
        ))}
      </nav>

      {crew.length > 0 && (
        <>
          <SectionLabel className="mt-6">On site today</SectionLabel>
          <ul className="mt-1.5 space-y-0.5">
            {crew.slice(0, 3).map((member) => (
              <li key={member.id} className="flex items-center gap-2.5 rounded-full px-2 py-1.5">
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

      <div className="mt-auto pt-6">
        <SectionLabel>Account</SectionLabel>
        <nav className="mt-1.5 flex flex-col gap-1">
          {ACCOUNT.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActiveHref(pathname, item.href)}
              onNavigate={onClose}
            />
          ))}
          <Link
            href="/settings#sign-out"
            onClick={onClose}
            className="flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-medium text-status-risk transition-colors hover:bg-rose-50"
          >
            <span className="icon-tile size-9 bg-white/70 text-status-risk">
              <LogOut className="size-4.5" />
            </span>
            Sign out
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
        "px-4 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle",
        className,
      )}
    >
      {children}
    </p>
  );
}
