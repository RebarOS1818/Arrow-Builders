import { CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { ApprovalActions } from "@/components/approvals/approval-actions";
import { ClickableRow } from "@/components/phases/clickable-row";
import { EditApprovalForm } from "@/components/phases/edit-forms";
import { getApprovals, getProjects } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ApprovalKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<ApprovalKind, string> = {
  change_order: "Change Order",
  payment_application: "Payment Application",
  submittal: "Submittal",
  rfq: "RFQ",
  rfi: "RFI",
};

export default async function ApprovalsPage() {
  const [approvals, projects] = await Promise.all([getApprovals(), getProjects()]);
  const totalValue = approvals.reduce((sum, a) => sum + Number(a.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {approvals.length} pending · {formatCurrency(totalValue)} awaiting sign-off
        </p>
      </div>

      <div className="card scroll-thin overflow-x-auto">
        <table role="table" className="stacked-table w-full min-w-[720px] text-sm">
          <thead role="rowgroup">
            <tr role="row" className="border-b border-line text-left text-xs font-semibold text-ink-muted">
              <th role="columnheader" className="px-4 py-3">Reference</th>
              <th role="columnheader" className="px-4 py-3">Type</th>
              <th role="columnheader" className="px-4 py-3">Project</th>
              <th role="columnheader" className="px-4 py-3">Submitted</th>
              <th role="columnheader" className="px-4 py-3 text-right">Amount</th>
              <th role="columnheader" className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody role="rowgroup" className="divide-y divide-line">
            {approvals.map((approval) => (
              <ClickableRow key={approval.id} className="cursor-pointer hover:bg-canvas/60">
                <td role="cell" className="px-4 py-3 font-medium">{approval.reference}</td>
                <td role="cell" data-label="Type" className="px-4 py-3 text-ink-muted">
                  {KIND_LABELS[approval.kind]}
                </td>
                <td role="cell" data-label="Project" className="px-4 py-3 text-ink-muted">
                  <Link href={`/projects/${approval.project_id}`} className="hover:text-brand-700">
                    {approval.project.name}
                  </Link>
                </td>
                <td role="cell" data-label="Submitted" className="px-4 py-3 text-ink-muted">
                  {formatDate(approval.submitted_at)}
                </td>
                <td role="cell" data-label="Amount" className="px-4 py-3 text-right font-medium">
                  {approval.amount != null ? formatCurrency(approval.amount) : "—"}
                </td>
                <td role="cell" data-cell="action" className="px-4 py-3 text-right">
                  <span className="flex items-center justify-end gap-2">
                    <ApprovalActions id={approval.id} reference={approval.reference} />
                    <EditApprovalForm
                      approval={approval}
                      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
                    />
                  </span>
                </td>
              </ClickableRow>
            ))}
            {approvals.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-2">
                  <EmptyState variant="clear" icon={CheckCircle2} title="Nothing awaiting approval">
                    Change orders and invoices appear here when they need a
                    decision.
                  </EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
