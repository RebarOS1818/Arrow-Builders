"use client";

/**
 * A table row that opens its own record.
 *
 * The same idea as OpenOnClick, expressed as a <tr> because a table row cannot
 * legally contain a wrapping div. The Edit button inside remains the accessible
 * control; this only widens the target.
 */
export function ClickableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  function onClick(event: React.MouseEvent<HTMLTableRowElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, input, select, textarea, label, [role=dialog]")) return;
    if (window.getSelection()?.toString()) return;
    event.currentTarget
      .querySelector<HTMLButtonElement>("[data-record-trigger]:not([disabled])")
      ?.click();
  }

  return (
    // The role is explicit because these rows stack into cards on a phone, and
    // `display: block` drops a table's implicit semantics.
    <tr role="row" onClick={onClick} className={className}>
      {children}
    </tr>
  );
}
