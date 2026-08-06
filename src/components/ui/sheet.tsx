"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion, project, spring, type SpringHandle } from "@/lib/spring";

/** Past this fraction of its own height, a released sheet keeps going. */
const DISMISS_FRACTION = 0.4;
/** Movement before a drag commits, so a tap on the header is still a tap. */
const DRAG_THRESHOLD = 8;
/**
 * Deceleration used to project where a released drag was heading.
 *
 * Snappier than the 0.998 that models a scroll flywheel. That constant is tuned
 * for scrolling thousands of pixels, and at a moderate release speed it
 * projects over a thousand — more than the whole height of a sheet, so every
 * release, however gentle, would read as a throw. Here the projection only has
 * to decide between two outcomes across roughly one screen.
 */
const DECELERATION = 0.99;

/**
 * A modal surface: a sheet from the bottom on a phone, a centred dialog above.
 *
 * On the sheet, the grab area can be dragged down to dismiss, tracking the
 * finger 1:1 and deciding on release from where the gesture was *heading*
 * rather than where the finger stopped — a fast flick that only moved thirty
 * pixels should still throw it closed, and a slow drag most of the way down
 * should not.
 *
 * Motion is a spring rather than a transition because a transition cannot be
 * grabbed mid-flight: it interpolates from where it was told to start, so
 * catching a closing sheet would jump. A spring animates from wherever the
 * surface actually is.
 *
 * The sheet is kept mounted while it animates out, so entering and leaving
 * follow the same path — a surface that slides up and then vanishes reads as
 * two unrelated events.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  // Mounted covers the closing animation: `open` goes false first, and this
  // stays true until the spring has finished putting the sheet away.
  const [mounted, setMounted] = useState(open);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLButtonElement>(null);
  const animation = useRef<SpringHandle | null>(null);
  /** 0 = fully presented, 1 = fully dismissed. One value drives everything. */
  const progress = useRef(1);
  const height = useRef(0);

  const gesture = useRef<{
    startY: number;
    startProgress: number;
    /** Recent positions, newest last. Velocity is measured across a window. */
    samples: { y: number; t: number }[];
    dragging: boolean;
  } | null>(null);

  const paint = useCallback((p: number) => {
    progress.current = p;
    const surface = surfaceRef.current;
    if (surface) {
      // Two presentations from one value: the phone sheet travels, the desktop
      // dialog scales. Both read as the same surface arriving.
      surface.style.setProperty("--sheet-progress", String(p));
      surface.style.opacity = String(Math.max(0, 1 - p * 0.6));
    }
    // The scrim tracks the surface continuously, so dimming follows the finger
    // through the whole drag rather than switching at the end.
    const scrim = scrimRef.current;
    if (scrim) scrim.style.opacity = String(Math.max(0, 1 - p));
  }, []);

  const settle = useCallback(
    (to: number, velocity = 0) => {
      animation.current?.stop();

      if (prefersReducedMotion()) {
        paint(to);
        if (to === 1) setMounted(false);
        return;
      }

      animation.current = spring(
        progress.current,
        to,
        paint,
        // Bounce only when a flick preceded it. A surface that merely appeared
        // has no momentum to overshoot with.
        { bounce: velocity === 0 ? 0 : 0.12, response: 0.34, velocity },
        () => {
          if (to === 1) setMounted(false);
        },
      );
    },
    [paint],
  );

  // Mounting on open is derived during render, not in an effect: an effect
  // would render once with the sheet absent and only then mount it, which is a
  // wasted frame on the one interaction where the first frame matters.
  if (open && !mounted) setMounted(true);

  // Painted before the spring starts, so the first frame is off-screen rather
  // than a flash of the surface at its resting position.
  useEffect(() => {
    if (!open || !mounted) return;
    animation.current?.stop();
    paint(1);
    if (prefersReducedMotion()) paint(0);
    else animation.current = spring(1, 0, paint, { bounce: 0, response: 0.34 });
    return () => animation.current?.stop();
  }, [open, mounted, paint]);

  // Dismiss. Deferred by a frame so the spring — which unmounts when it rests —
  // is never started from inside the effect that observed the close.
  useEffect(() => {
    if (open || !mounted) return;
    const frame = requestAnimationFrame(() => settle(1));
    return () => cancelAnimationFrame(frame);
  }, [open, mounted, settle]);

  function onPointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return;
    // Taking over from a running animation rather than queueing behind it: the
    // sheet follows the finger from wherever it currently is.
    animation.current?.stop();
    // Captured on press, not on first movement. The handle is a couple of
    // dozen pixels tall, so the first real movement is already outside it —
    // wait for a move to claim the pointer and the move never arrives. This is
    // safe here, unlike on a draggable card, because the handle contains
    // nothing clickable for the capture to steal events from.
    event.currentTarget.setPointerCapture(event.pointerId);
    height.current = surfaceRef.current?.getBoundingClientRect().height ?? 1;
    gesture.current = {
      startY: event.clientY,
      startProgress: progress.current,
      samples: [{ y: event.clientY, t: event.timeStamp }],
      dragging: false,
    };
  }

  function onPointerMove(event: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;

    const dy = event.clientY - g.startY;
    // Hysteresis: a press that wobbles a few pixels is still a press.
    if (!g.dragging) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      g.dragging = true;
    }

    g.samples.push({ y: event.clientY, t: event.timeStamp });
    // A short window is enough to know the direction and speed of a throw, and
    // short enough that a pause before release reads as a stop.
    if (g.samples.length > 8) g.samples.shift();

    const next = g.startProgress + dy / height.current;
    // Upward, resist progressively rather than stopping dead. A hard stop reads
    // as frozen; resistance reads as "there is nothing above this".
    paint(next < 0 ? next * 0.3 : Math.min(1, next));
  }

  function onPointerUp() {
    const g = gesture.current;
    gesture.current = null;
    if (!g?.dragging) return;

    const velocity = velocityFrom(g.samples);
    // Where the gesture was heading, not where the finger happened to stop.
    const projected = progress.current + project(velocity, DECELERATION) / height.current;

    if (projected > DISMISS_FRACTION) {
      settle(1, velocity / height.current);
      onClose();
    } else {
      settle(0, velocity / height.current);
    }
  }

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        ref={scrimRef}
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
      />

      <div
        ref={surfaceRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{ opacity: 0 }}
        className={`sheet-surface relative max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-surface shadow-material sm:max-w-2xl sm:rounded-[2rem] ${className}`}
      >
        {/* The grab area. A visible handle, because an affordance nobody can
            see is one nobody uses — and it is the only part that drags, so a
            scrollable body still scrolls. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="sticky top-0 z-10 grid touch-none place-items-center bg-surface pt-3 pb-1 sm:hidden"
        >
          <span aria-hidden className="h-1.5 w-10 rounded-full bg-line-strong" />
        </div>

        {children}
      </div>
    </div>
  );
}

/**
 * Speed at release, in pixels per second, measured across the tail of the
 * gesture rather than between the final two points.
 *
 * Browsers coalesce pointer events under load, so the last pair can be a single
 * stale sample — and a throw whose velocity reads as zero settles back instead
 * of flying, which feels like the interface ignored you. Taking the oldest
 * sample inside the window survives that.
 */
function velocityFrom(samples: { y: number; t: number }[]): number {
  const last = samples.at(-1);
  if (!last) return 0;
  const WINDOW_MS = 100;
  const first = samples.find((s) => last.t - s.t <= WINDOW_MS) ?? samples[0]!;
  const dt = last.t - first.t;
  return dt > 0 ? ((last.y - first.y) / dt) * 1000 : 0;
}
