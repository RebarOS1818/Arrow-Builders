"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GripVertical, MapPin } from "lucide-react";
import { moveProperty } from "@/app/(app)/development/actions";
import { PIPELINE } from "@/lib/pipeline";
import { formatCompactCurrency } from "@/lib/utils";
import type { Property, PropertyStatus } from "@/lib/types";

/** The pipeline is the board. Columns are never declared here. */
const COLUMNS = PIPELINE;

type Drag = {
  id: string;
  /** Pointer offset inside the card, so it does not jump to the cursor. */
  dx: number;
  dy: number;
  x: number;
  y: number;
  width: number;
  over: PropertyStatus | null;
  moved: boolean;
};

/**
 * Properties as a board, one column per status.
 *
 * Dragging uses pointer events rather than HTML5 drag-and-drop, which does not
 * fire on touch at all — this gets used on a tablet in a truck, so a
 * mouse-only board would be a board that does not work.
 *
 * Keyboard is a first-class path, not an afterthought: focus a card, press
 * Space to pick it up, arrow left and right to move it between columns, Space
 * to drop, Escape to put it back. Dragging is the only way to reorder in most
 * boards, which quietly excludes anyone not using a pointer.
 */
export function PropertyBoard({ properties }: { properties: Property[] }) {
  /**
   * Moves this session has made but the server has not echoed back yet.
   *
   * Held separately from the rows rather than copied into state, so a refresh
   * anywhere else in the app still flows through. Once the server agrees, the
   * entry equals the row's own status and stops having any effect.
   */
  const [pending, setPending] = useState<Record<string, PropertyStatus>>({});
  const [drag, setDrag] = useState<Drag | null>(null);
  const [held, setHeld] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const columnRefs = useRef(new Map<PropertyStatus, HTMLElement>());
  const router = useRouter();

  const items = properties.map((p) =>
    pending[p.id] && pending[p.id] !== p.status ? { ...p, status: pending[p.id]! } : p,
  );

  async function commit(id: string, status: PropertyStatus) {
    const current = items.find((p) => p.id === id);
    if (!current || current.status === status) return;

    // Moved first, so the card lands where it was dropped rather than pausing.
    setPending((m) => ({ ...m, [id]: status }));
    setError(null);

    const result = await moveProperty(id, status);
    if (!result.ok) {
      // Put it back where it came from. A card that stays in the new column
      // after a failed save is a lie the next person will act on.
      setPending((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
      setError(result.error);
      return;
    }
    router.refresh();
  }

  function columnUnder(x: number, y: number): PropertyStatus | null {
    for (const [status, node] of columnRefs.current) {
      const r = node.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return status;
    }
    return null;
  }

  function onPointerDown(event: React.PointerEvent<HTMLElement>, property: Property) {
    if (event.button !== 0) return;
    const card = event.currentTarget.getBoundingClientRect();
    // Capture is claimed on the first real movement, not here. Capturing on
    // press redirects every later event to the card, so the click never reaches
    // the title link inside it and tapping a parcel stops opening it.
    setDrag({
      id: property.id,
      dx: event.clientX - card.left,
      dy: event.clientY - card.top,
      x: event.clientX,
      y: event.clientY,
      width: card.width,
      over: property.status,
      moved: false,
    });
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    if (!drag) return;
    const x = event.clientX;
    const y = event.clientY;
    // A few pixels of slop, so a tap that wobbles is still a tap and follows
    // the link rather than becoming a drag.
    const moved = drag.moved || Math.abs(x - drag.x) > 4 || Math.abs(y - drag.y) > 4;
    if (moved && !drag.moved) {
      // Now it is a drag: take the pointer so leaving the card does not drop it.
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }
    setDrag({ ...drag, x, y, moved, over: columnUnder(x, y) });
  }

  function onPointerUp(event: React.PointerEvent<HTMLElement>) {
    if (!drag) return;
    const target = drag.over;
    const wasDrag = drag.moved;
    if (wasDrag) {
      (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    }
    setDrag(null);
    if (wasDrag && target) void commit(drag.id, target);
  }

  /**
   * A tap that never became a drag opens the parcel.
   *
   * The whole card is the target, not just the title. A click that landed on
   * the title link belongs to the link, and a click at the end of a drag is not
   * a click at all.
   */
  function onCardClick(event: React.MouseEvent<HTMLElement>, property: Property) {
    if (drag?.moved) return;
    const el = event.target as HTMLElement;
    if (el.closest("a, button, [role=dialog]")) return;
    if (window.getSelection()?.toString()) return;
    router.push(`/development/${property.id}`);
  }

  function onKeyDown(event: React.KeyboardEvent, property: Property) {
    const order = COLUMNS.map((c) => c.status);
    const at = order.indexOf(property.status);

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setHeld(held === property.id ? null : property.id);
      return;
    }
    if (held !== property.id) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setHeld(null);
    } else if (event.key === "ArrowRight" && at < order.length - 1) {
      event.preventDefault();
      void commit(property.id, order[at + 1]!);
    } else if (event.key === "ArrowLeft" && at > 0) {
      event.preventDefault();
      void commit(property.id, order[at - 1]!);
    }
  }

  const dragging = drag?.moved ? items.find((p) => p.id === drag.id) : null;

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-tile bg-rose-50 p-3 text-sm text-status-risk" role="alert">
          {error}
        </p>
      )}

      <p className="text-xs text-ink-subtle">
        Drag a parcel to change its status, or focus one and press Space then the
        arrow keys.
      </p>

      <div className="scroll-thin flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((column) => {
          const inColumn = items.filter((p) => p.status === column.status);
          const isTarget = drag?.moved && drag.over === column.status;

          return (
            <section
              key={column.status}
              ref={(node) => {
                if (node) columnRefs.current.set(column.status, node);
                else columnRefs.current.delete(column.status);
              }}
              aria-label={`${column.label}, ${inColumn.length} ${inColumn.length === 1 ? "parcel" : "parcels"}`}
              className={`flex w-72 shrink-0 flex-col rounded-card p-2.5 transition-colors ${
                isTarget ? "ring-2 ring-brand-400" : ""
              } ${column.tint}`}
            >
              {/* The stage's own colour, carried as a filled header rather than
                  a dot: at nine columns the eye needs to find a stage without
                  reading every label. */}
              <header
                className={`flex items-center justify-between gap-2 rounded-full px-3 py-1.5 ${column.fill}`}
              >
                <h3 className="truncate text-sm font-semibold tracking-tight">{column.label}</h3>
                <span className="text-xs font-semibold tabular-nums opacity-80">
                  {inColumn.length}
                </span>
              </header>
              <p className="px-1.5 pb-2 pt-2 text-xs text-ink-subtle">{column.hint}</p>

              <div className="flex flex-col gap-2">
                {inColumn.map((property) => {
                  const isHeld = held === property.id;
                  const isDragging = drag?.moved && drag.id === property.id;

                  return (
                    <article
                      key={property.id}
                      tabIndex={0}
                      aria-grabbed={isHeld || isDragging || undefined}
                      onKeyDown={(e) => onKeyDown(e, property)}
                      onClick={(e) => onCardClick(e, property)}
                      onPointerDown={(e) => onPointerDown(e, property)}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerCancel={onPointerUp}
                      className={`card cursor-pointer touch-none select-none p-3 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                        isDragging ? "opacity-40" : "hover:shadow-lift"
                      } ${isHeld ? "ring-2 ring-brand-500" : ""}`}
                    >
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="mt-0.5 size-3.5 shrink-0 cursor-grab text-ink-subtle" />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/development/${property.id}`}
                            // A click that followed a drag would navigate away
                            // from the board the moment you dropped a card.
                            onClick={(e) => drag?.moved && e.preventDefault()}
                            draggable={false}
                            className="block truncate font-semibold tracking-tight hover:text-brand-700"
                          >
                            {property.name}
                          </Link>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-subtle">
                            <MapPin className="size-3 shrink-0" />
                            {[property.city, property.state].filter(Boolean).join(", ") || "—"}
                          </p>
                        </div>
                      </div>

                      <dl className="mt-2.5 flex items-baseline justify-between text-xs">
                        <dt className="text-ink-subtle">Asking</dt>
                        <dd className="font-semibold tabular-nums">
                          {property.asking_price
                            ? formatCompactCurrency(property.asking_price)
                            : "—"}
                        </dd>
                      </dl>
                      {property.lot_size_acres != null && (
                        <p className="mt-1 text-xs text-ink-subtle">
                          {property.lot_size_acres} acres
                        </p>
                      )}

                      {isHeld && (
                        <p className="mt-2 text-xs font-medium text-brand-700">
                          Held. Arrow keys move it, Escape puts it back.
                        </p>
                      )}
                    </article>
                  );
                })}

                {inColumn.length === 0 && (
                  <p className="rounded-tile border border-dashed border-line-strong p-4 text-center text-xs text-ink-subtle">
                    Nothing here
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* The card under the cursor. Rendered outside the columns so it is not
          clipped by their scroll containers. */}
      {dragging && drag && (
        <div
          aria-hidden
          className="card pointer-events-none fixed z-50 p-3 opacity-95 shadow-material"
          style={{
            left: drag.x - drag.dx,
            top: drag.y - drag.dy,
            width: drag.width,
          }}
        >
          <p className="truncate font-semibold tracking-tight">{dragging.name}</p>
          <p className="mt-0.5 truncate text-xs text-ink-subtle">
            {[dragging.city, dragging.state].filter(Boolean).join(", ") || "—"}
          </p>
        </div>
      )}
    </div>
  );
}
