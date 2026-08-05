import { NextResponse } from "next/server";
import { inspectWorkspace } from "@/lib/smartsuite/inspect";
import { billingCaller } from "@/lib/sola/org";

/**
 * The workspace report as JSON, for pasting somewhere it can be read.
 *
 * Read-only. Admin-only, reusing the billing caller because it already answers
 * the same question — who is asking, and do they run this organization.
 */
export async function GET() {
  const caller = await billingCaller();
  if (!caller.ok) {
    return NextResponse.json({ error: caller.error }, { status: caller.status });
  }

  const report = await inspectWorkspace();
  if (!report.ok) {
    return NextResponse.json({ error: report.error }, { status: report.status });
  }

  return NextResponse.json({ solutions: report.solutions });
}
