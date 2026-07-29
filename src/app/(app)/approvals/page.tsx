import Link from "next/link";
import { getApprovals } from "@/lib/data";
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
  const approvals = await getApprovals();
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
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold text-ink-muted">
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {approvals.map((approval) => (
              <tr key={approval.id} className="hover:bg-canvas/60">
                <td className="px-4 py-3 font-medium">{approval.reference}</td>
                <td className="px-4 py-3 text-ink-muted">{KIND_LABELS[approval.kind]}</td>
                <td className="px-4 py-3 text-ink-muted">
                  <Link href={`/projects/${approval.project_id}`} className="hover:text-brand-700">
                    {approval.project.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-muted">{formatDate(approval.submitted_at)}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {approval.amount != null ? formatCurrency(approval.amount) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-muted hover:text-ink"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-brand-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-800"
                    >
                      Approve
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {approvals.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                  Nothing awaiting approval.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
