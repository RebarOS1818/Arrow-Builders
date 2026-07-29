"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import type { CashFlowPoint } from "@/lib/types";

const INFLOW = "var(--color-brand-200)";
const OUTFLOW = "#e8a76a";
const NET = "var(--color-brand-600)";

const axisMoney = (v: number) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  return abs >= 1000 ? `${sign}$${Math.round(abs / 1000)}K` : `${sign}$${abs}`;
};

export function CashFlowCard({
  points,
  priorNet,
}: {
  points: CashFlowPoint[];
  priorNet: number;
}) {
  const data = points.map((p) => ({
    label: formatShortDate(p.period),
    inflow: Number(p.inflow),
    outflow: -Number(p.outflow),
    net: Number(p.inflow) - Number(p.outflow),
  }));

  const netTotal = data.reduce((sum, d) => sum + d.net, 0);
  const deltaPct = priorNet ? Math.round(((netTotal - priorNet) / Math.abs(priorNet)) * 100) : 0;

  return (
    <section className="card flex flex-col p-4">
      <h2 className="font-semibold tracking-tight">
        Cash Flow <span className="font-normal text-ink-muted">(Next 90 Days)</span>
      </h2>

      <div className="mt-2 flex items-center gap-4 text-xs text-ink-muted">
        <Legend color={INFLOW} label="Inflow" />
        <Legend color={OUTFLOW} label="Outflow" />
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: NET }} />
          Net
        </span>
      </div>

      {/* Fixed height: ResponsiveContainer needs a resolved parent height, and a
          flex child inside a flex column resolves to zero. */}
      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--color-ink-subtle)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={axisMoney}
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fontSize: 11, fill: "var(--color-ink-subtle)" }}
            />
            <ReferenceLine y={0} stroke="var(--color-line-strong)" />
            <Tooltip
              cursor={{ fill: "var(--color-canvas)" }}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid var(--color-line)",
                fontSize: 12,
              }}
              formatter={(value, name) => {
                const amount = typeof value === "number" ? value : Number(value ?? 0);
                const label = String(name ?? "");
                return [formatCurrency(Math.abs(amount)), label.charAt(0).toUpperCase() + label.slice(1)];
              }}
            />
            <Bar dataKey="inflow" fill={INFLOW} radius={[3, 3, 0, 0]} barSize={14} />
            <Bar dataKey="outflow" fill={OUTFLOW} radius={[0, 0, 3, 3]} barSize={14} />
            <Line
              type="monotone"
              dataKey="net"
              stroke={NET}
              strokeWidth={2}
              dot={{ r: 3, fill: NET, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-auto flex items-end justify-between border-t border-line pt-3">
        <div>
          <p className="text-xs text-ink-muted">Net Cash Flow</p>
          <p className="text-xl font-semibold tracking-tight">{formatCurrency(netTotal)}</p>
        </div>
        <span className="flex items-center gap-1 pb-1 text-xs font-medium text-brand-700">
          <TrendingUp className="size-3.5" />
          {deltaPct > 0 ? "+" : ""}
          {deltaPct}% vs prior 90 days
        </span>
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
