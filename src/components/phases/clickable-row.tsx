"use client";

import { cn } from "@/lib/utils";
import { openRecord } from "./open-on-click";

/**
 * A table row that opens its own record.
 *
 * The same idea as OpenOnClick, expressed as a <tr> because a table row cannot
 * legally contain a wrapping div. The pencil inside remains the accessible
 * control and surfaces on hover; this is what people actually click.
 */
export function ClickableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // The role is explicit because these rows stack into cards on a phone, and
    // `display: block` drops a table's implicit semantics.
    <tr
      role="row"
      data-open-scope=""
      onClick={openRecord}
      className={cn("group", className)}
    >
      {children}
    </tr>
  );
}
