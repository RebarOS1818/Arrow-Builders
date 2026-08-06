"use client";

import { cn } from "@/lib/utils";

/**
 * Makes a whole row or card open the record.
 *
 * The container is the control now. An Edit button repeated down forty rows is
 * forty copies of the same word competing with the data they sit beside, and it
 * asks people to aim at a pill when the thing they mean is the row — which they
 * were already clicking, and which already worked. The pencil is still there,
 * but it only surfaces on hover, as a reminder of what the click does rather
 * than as the thing you have to hit.
 *
 * Deliberately not a button itself, and deliberately not focusable. A row
 * carrying a link, a pencil and a status pill cannot also be a control without
 * nesting interactive elements inside each other — invalid HTML that screen
 * readers and keyboards both handle badly. The accessible path stays the real
 * button, which is why it remains in the DOM and reachable by tab.
 */
export function OpenOnClick({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-open-scope=""
      onClick={openRecord}
      className={cn("group", className)}
    >
      {children}
    </div>
  );
}

/**
 * Shared by OpenOnClick and ClickableRow.
 *
 * The trigger has to be *this* container's own, not the first one anywhere
 * beneath it: a bid package card contains its quotes, each with an editor of
 * its own, and a naive `querySelector` would open the package no matter which
 * line was clicked. Matching on the nearest enclosing scope picks the right one,
 * and stopping propagation keeps the outer container from opening on top of it.
 */
export function openRecord(event: React.MouseEvent<HTMLElement>) {
  const target = event.target as HTMLElement;

  // A click that landed on something already interactive belongs to it. A link
  // should navigate, a checkbox should toggle, text being selected should stay
  // selected.
  if (target.closest("a, button, input, select, textarea, label, [role=dialog]")) return;
  if (window.getSelection()?.toString()) return;

  const root = event.currentTarget;
  const trigger = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-record-trigger]:not([disabled])"),
  ).find((el) => el.closest("[data-open-scope]") === root);

  if (!trigger) return;
  event.stopPropagation();
  trigger.click();
}
