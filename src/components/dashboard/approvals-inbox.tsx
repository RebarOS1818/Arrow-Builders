import Link from "next/link";
import { FileText, Receipt, ScrollText, HelpCircle, FileSignature } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ApprovalKind, ApprovalWithProject } from "@/lib/types";

const ICONS: Record<ApprovalKind, React.ElementType> = {
  change_order: FileSignature,
  payment_application: Receipt,
  submittal: FileText,
  rfq: ScrollText,
  rfi: HelpCircle,
};

/** "Today" / "Yesterday" / "May 14" — matches how the field reads a queue. */
function relativeDay(iso: string, today: string) {
  const day = iso.slice(0, 10);
  if (day === today) return "Today";

  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === yesterday.toISOString().slice(0, 10)) return "Yesterday";

  return new Date(`${day}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ApprovalsInbox({
  approvals,
  today,
}: {
  approvals: ApprovalWithProject[];
  today: string;
}) {
  return (
    <section className="card flex flex-col p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold tracking-tight">Approvals Inbox</h2>
        <Link href="/approvals" className="text-sm font-medium text-brand-700 hover:underline">
          View all
        </Link>
      </div>

      <ul className="mt-3 flex-1 divide-y divide-line">
        {approvals.slice(0, 4).map((approval) => {
          const Icon = ICONS[approval.kind];
          return (
            <li key={approval.id} className="flex items-center gap-3 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-canvas text-ink-muted">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{approval.reference}</p>
                <p className="truncate text-xs text-ink-muted">{approval.project.name}</p>
              </div>
              <div className="shrink-0 text-right">
                {approval.amount != null && (
                  <p className="text-sm font-semibold">{formatCurrency(approval.amount)}</p>
                )}
                <p className="text-xs text-ink-subtle">
                  {relativeDay(approval.submitted_at, today)}
                </p>
              </div>
            </li>
          );
        })}

        {approvals.length === 0 && (
          <li className="py-6 text-center text-sm text-ink-muted">Inbox is clear.</li>
        )}
      </ul>

      <Link
        href="/approvals"
        className="mt-1 border-t border-line pt-3 text-sm font-medium text-brand-700 hover:underline"
      >
        Go to approvals
      </Link>
    </section>
  );
}
