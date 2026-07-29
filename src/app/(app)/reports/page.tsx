import { BudgetChart, CompletionChart, TaskStatusChart } from "@/components/reports/report-charts";
import { CashFlowCard } from "@/components/dashboard/cash-flow-card";
import { getCashFlow, getProjects, getTasks } from "@/lib/data";
import { formatMillions } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_ORDER: { status: TaskStatus; label: string }[] = [
  { status: "done", label: "Done" },
  { status: "in_progress", label: "In Progress" },
  { status: "scheduled", label: "Scheduled" },
  { status: "blocked", label: "Blocked" },
  { status: "unscheduled", label: "Unscheduled" },
];

export default async function ReportsPage() {
  const [projects, tasks, cashFlow] = await Promise.all([getProjects(), getTasks(), getCashFlow()]);

  const budgetData = projects.map((p) => ({
    name: p.name,
    budget: Number(p.budget_total),
    spent: Number(p.budget_spent),
  }));

  const completionData = projects.map((p) => ({ name: p.name, pct: p.completion_pct }));

  const statusData = STATUS_ORDER.map(({ status, label }) => ({
    name: label,
    value: tasks.filter((t) => t.status === status).length,
  })).filter((d) => d.value > 0);

  const totalBudget = budgetData.reduce((sum, d) => sum + d.budget, 0);
  const totalSpent = budgetData.reduce((sum, d) => sum + d.spent, 0);
  const burnPct = totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Portfolio performance across {projects.length} projects and {tasks.length} tasks.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary label="Total Budget" value={formatMillions(totalBudget)} />
        <Summary label="Committed to Date" value={formatMillions(totalSpent)} />
        <Summary label="Budget Burn" value={`${burnPct}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-semibold tracking-tight">Budget vs. Spend</h2>
          <p className="mb-2 text-xs text-ink-muted">Contract value against committed cost.</p>
          <BudgetChart data={budgetData} />
        </section>

        <section className="card p-4">
          <h2 className="font-semibold tracking-tight">Task Status</h2>
          <p className="mb-2 text-xs text-ink-muted">Distribution across the whole portfolio.</p>
          <TaskStatusChart data={statusData} />
        </section>

        <section className="card p-4">
          <h2 className="font-semibold tracking-tight">Completion by Project</h2>
          <p className="mb-2 text-xs text-ink-muted">Percent complete, latest field report.</p>
          <CompletionChart data={completionData} />
        </section>

        <CashFlowCard points={cashFlow} priorNet={218_000} />
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
