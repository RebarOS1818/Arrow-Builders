"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TopNav } from "@/components/layout/top-nav";
import { NavRail } from "@/components/layout/nav-rail";
import { Sidebar } from "@/components/layout/sidebar";
import { prefersReducedMotion, project, spring, type SpringHandle } from "@/lib/spring";

type CrewMember = { id: string; full_name: string; initials: string; role: string };

const DRAWER_WIDTH = 240;
/** Movement before a drag commits to a direction, so taps are not stolen. */
const DRAG_THRESHOLD = 10;

/**
 * Owns the mobile navigation. Below `lg` the sidebar is a drawer that tracks the
 * finger; from `lg` up it is a static column and none of this runs.
 *
 * Driven by pointer events and a spring rather than a CSS transition, so it can
 * be grabbed mid-flight and reversed. Closing is not a fixed animation that must
 * play out — drag it partway and let go, and where it lands depends on where the
 * gesture was heading.
 */
export function AppShell({
  user,
  crew,
  children,
}: {
  user: { full_name: string; initials: string; role: string };
  crew: CrewMember[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const animation = useRef<SpringHandle | null>(null);

  /** Live drawer offset: 0 = fully open, -DRAWER_WIDTH = fully closed. */
  const offset = useRef(-DRAWER_WIDTH);
  const gesture = useRef<{
    startX: number;
    startY: number;
    startOffset: number;
    lastX: number;
    lastT: number;
    velocity: number;
    /** Locked on the first real movement; a scroll never becomes a drag. */
    axis: "drag" | "scroll" | null;
  } | null>(null);

  const paint = useCallback((x: number) => {
    offset.current = x;
    // A custom property rather than transform directly: at `lg` the sidebar is
    // a static column and Tailwind's lg:translate-x-0 must win, which it cannot
    // do against an inline transform.
    const drawer = drawerRef.current;
    if (drawer) drawer.style.setProperty("--drawer-x", `${x}px`);
    // The scrim tracks the drawer, so dimming is continuous through the whole
    // gesture rather than appearing only once it commits.
    const scrim = scrimRef.current;
    if (scrim) scrim.style.opacity = String(Math.max(0, 1 + x / DRAWER_WIDTH));
  }, []);

  const settle = useCallback(
    (to: number, velocity = 0) => {
      animation.current?.stop();

      if (prefersReducedMotion()) {
        paint(to);
        if (to !== 0) setOpen(false);
        return;
      }

      animation.current = spring(
        offset.current,
        to,
        paint,
        // Bounce only when a flick preceded it. Overshoot on something that
        // merely appeared would feel wrong.
        { bounce: velocity === 0 ? 0 : 0.15, response: 0.35, velocity },
        () => {
          if (to !== 0) setOpen(false);
        },
      );
    },
    [paint],
  );

  const close = useCallback(() => settle(-DRAWER_WIDTH), [settle]);

  // Spring the drawer in whenever it opens, from off-screen.
  useEffect(() => {
    if (!open) return;

    animation.current?.stop();
    paint(-DRAWER_WIDTH);
    if (prefersReducedMotion()) paint(0);
    else animation.current = spring(-DRAWER_WIDTH, 0, paint, { bounce: 0, response: 0.35 });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      animation.current?.stop();
    };
  }, [open, paint, close]);

  function onPointerDown(event: React.PointerEvent) {
    // Grabbing mid-flight takes over from the animation rather than queueing
    // behind it: the drawer follows the finger from wherever it currently is.
    animation.current?.stop();
    gesture.current = {
      startX: event.clientX,
      startY: event.clientY,
      startOffset: offset.current,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
      // Null until the first real movement decides which way this gesture is
      // going; "scroll" then means leave it alone for the rest of the gesture.
      axis: null,
    };
  }

  function onPointerMove(event: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;

    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;

    // The drawer scrolls now, so a gesture has to be one thing or the other.
    // Whichever axis moves further first wins and holds for the whole gesture:
    // without this, scrolling the nav with a thumb that drifts a few pixels
    // sideways would drag the drawer off screen mid-scroll.
    if (g.axis === null && Math.max(Math.abs(dx), Math.abs(dy)) >= DRAG_THRESHOLD) {
      g.axis = Math.abs(dy) > Math.abs(dx) ? "scroll" : "drag";
    }
    if (g.axis !== "drag") return;

    if (!dragging) {
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    const dt = event.timeStamp - g.lastT;
    if (dt > 0) g.velocity = ((event.clientX - g.lastX) / dt) * 1000;
    g.lastX = event.clientX;
    g.lastT = event.timeStamp;

    const next = g.startOffset + dx;
    // Past the open edge, resist progressively instead of stopping dead — a
    // hard stop reads as frozen, resistance reads as "there is nothing more".
    paint(next > 0 ? next * 0.25 : Math.max(-DRAWER_WIDTH, next));
  }

  function onPointerUp() {
    const g = gesture.current;
    gesture.current = null;

    if (!g || !dragging) {
      setDragging(false);
      return;
    }
    setDragging(false);

    // Land where the gesture is heading, not where the finger happened to stop.
    const projected = offset.current + project(g.velocity);
    settle(projected < -DRAWER_WIDTH / 2 ? -DRAWER_WIDTH : 0, g.velocity);
  }

  return (
    /*
     * Two nested frames on a tinted page, rather than a layout run to the window
     * edges. The outer one holds the navigation and is the quieter surface; the
     * content panel sits inside it, inset on three sides, so the rail reads as
     * the thing the page is resting against.
     */
    <div className="min-h-screen p-2 sm:p-3 lg:p-4">
      {open && (
        <div
          ref={scrimRef}
          className="fixed inset-0 z-40 bg-ink/25 lg:hidden"
          style={{ opacity: 0 }}
          aria-hidden="true"
          onPointerDown={close}
        />
      )}

      {/* The rail is the navigation from lg up; below that this drawer is. */}
      <Sidebar
        ref={drawerRef}
        crew={crew}
        open={open}
        dragging={dragging}
        onClose={close}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      <div className="flex min-h-[calc(100vh-1rem)] gap-3 rounded-frame bg-shell p-2 shadow-soft ring-1 ring-white/60 sm:min-h-[calc(100vh-1.5rem)] lg:min-h-[calc(100vh-2rem)] lg:p-3">
        {/* Sticky so ten destinations stay reachable while a long table scrolls
            behind them — the whole point of giving navigation its own column. */}
        <div className="sticky top-3 hidden h-[calc(100vh-4rem)] lg:flex">
          <NavRail />
        </div>

        <div className="min-w-0 flex-1 rounded-[1.75rem] bg-canvas/70 px-3 py-3 sm:px-5 sm:py-4">
          <TopNav
            user={user}
            onMenu={() => setOpen(true)}
            menuButtonRef={triggerRef}
            menuOpen={open}
          />
          <main className="pb-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
