"use client";

/**
 * Makes a whole row or card open the record, not just the Edit button in it.
 *
 * The button stays exactly where it was. This adds a second, larger way in for
 * anyone using a mouse or a thumb, which on a card the size of a business card
 * is the difference between a target you aim at and one you just hit.
 *
 * Deliberately not a button itself, and deliberately not focusable. A row
 * carrying a link, an Edit button and a status pill cannot also be a control
 * without nesting interactive elements inside each other — invalid HTML that
 * screen readers and keyboards both handle badly. The accessible path stays the
 * real button; this is a convenience layered on top of it.
 */
export function OpenOnClick({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  function onClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;

    // A click that landed on something already interactive belongs to it. A
    // link should navigate, a checkbox should toggle, text being selected
    // should stay selected.
    if (target.closest("a, button, input, select, textarea, label, [role=dialog]")) return;
    if (window.getSelection()?.toString()) return;

    const trigger = event.currentTarget.querySelector<HTMLButtonElement>(
      "[data-record-trigger]:not([disabled])",
    );
    trigger?.click();
  }

  return (
    <div onClick={onClick} className={className}>
      {children}
    </div>
  );
}
