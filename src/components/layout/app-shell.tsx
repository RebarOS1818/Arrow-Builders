"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
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
  user: { full_name: string; initials: string };
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
    startOffset: number;
    lastX: number;
    lastT: number;
    velocity: number;
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
      startOffset: offset.current,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
    };
  }

  function onPointerMove(event: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;

    const dx = event.clientX - g.startX;
    if (!dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
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
    <div className="flex min-h-screen">
      {open && (
        <div
          ref={scrimRef}
          className="fixed inset-0 z-40 bg-ink/25 lg:hidden"
          style={{ opacity: 0 }}
          aria-hidden="true"
          onPointerDown={close}
        />
      )}

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

      <div className="min-w-0 flex-1 px-4 py-5 sm:px-6">
        <AppHeader
          user={user}
          onMenu={() => setOpen(true)}
          menuButtonRef={triggerRef}
          menuOpen={open}
        />
        <main className="pb-10">{children}</main>
      </div>
    </div>
  );
}
