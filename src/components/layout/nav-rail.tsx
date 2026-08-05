"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowMark } from "@/components/brand/arrow-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { NavLink } from "@/components/layout/nav-link";
import { ACCOUNT, WORK, isActiveHref } from "@/components/layout/nav-items";

/**
 * The persistent navigation panel, from `lg` up.
 *
 * The reference this is drawn from uses a thin icon-only rail, which works
 * there because it has five destinations with unmistakable icons. This has ten,
 * and three of them are Development, Construction and Projects — close enough
 * in meaning that an icon alone is a guess every time. So it keeps the rail's
 * material and shape and carries labels, which is the part that has to survive
 * being used at speed.
 *
 * Every destination is visible at once. The version this replaces scrolled ten
 * links sideways behind a fade, so the last four were only reachable by
 * dragging a strip most people never realised moved.
 */
export function NavRail() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Main navigation"
      className="hidden w-[15.5rem] shrink-0 flex-col gap-6 py-1 pl-1 lg:flex"
    >
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-full px-1.5 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <span className="icon-tile size-10 bg-brand-700 text-accent-500">
          <ArrowMark className="w-5" />
        </span>
        <Wordmark className="text-[0.9375rem]" />
      </Link>

      {/* Scrolls only if the viewport is genuinely too short, and vertically —
          which is a scroll people find, unlike a sideways one. */}
      <nav className="scroll-thin -mr-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {WORK.map((item) => (
          <NavLink key={item.href} item={item} active={isActiveHref(pathname, item.href)} />
        ))}

        <p className="mt-5 px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
          Account
        </p>
        {ACCOUNT.map((item) => (
          <NavLink key={item.href} item={item} active={isActiveHref(pathname, item.href)} />
        ))}
      </nav>
    </aside>
  );
}
