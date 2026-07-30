"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const SPENT = "var(--color-brand-600)";
const BUDGET = "var(--color-brand-200)";

/**
 * Keyed by status so filtering out empty slices never shifts the colors.
 * Progress states walk a violet ramp; unscheduled is neutral slate so it reads
 * as "not started" rather than as another stage — and stays legible as legend text.
 */
const STATUS_COLORS: Record<string, string> = {
  Done: "var(--color-brand-700)",
  "In Progress": "var(--color-brand-500)",
  Scheduled: "var(--color-brand-300)",
  Blocked: "#e5484d",
  Unscheduled: "#94a3b8",
};

/** Legend text always renders in ink; only the swatch carries the series colour. */
function legendLabel(value: unknown) {
  return <span style={{ color: "var(--color-ink-muted)" }}>{String(value)}</span>;
}

const axisMoney = (v: number) => `$${Math.round(v / 1000)}K`;

export function BudgetChart({
  data,
}: {
  data: { name: string; spent: number; budget: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--color-ink-subtle)" }}
            interval={0}
            height={48}
            tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
          />
          <YAxis
            tickFormatter={axisMoney}
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fontSize: 11, fill: "var(--color-ink-subtle)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--color-canvas)" }}
            contentStyle={{ borderRadius: 10, border: "1px solid var(--color-line)", fontSize: 12 }}
            formatter={(value) => formatCurrency(Number(value ?? 0))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendLabel} />
          <Bar dataKey="budget" name="Budget" fill={BUDGET} radius={[4, 4, 0, 0]} />
          <Bar dataKey="spent" name="Spent" fill={SPENT} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TaskStatusChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={92}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "var(--color-line-strong)"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid var(--color-line)", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendLabel} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompletionChart({ data }: { data: { name: string; pct: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--color-line)" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--color-ink-subtle)" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--color-ink-muted)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--color-canvas)" }}
            contentStyle={{ borderRadius: 10, border: "1px solid var(--color-line)", fontSize: 12 }}
            formatter={(value) => `${Number(value ?? 0)}%`}
          />
          <Bar dataKey="pct" name="Complete" fill={SPENT} radius={[0, 4, 4, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
