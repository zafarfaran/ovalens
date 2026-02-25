"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface IncomeSource {
  label: string;
  gross_amount?: number;
  amount?: number;
}

interface IncomeBarChartProps {
  sources: IncomeSource[];
  totalIncome: number;
}

const fmt = (n: number) =>
  `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

const COLORS = ["#748ffc", "#38bdf8", "#a78bfa", "#2dd4bf", "#fbbf24", "#f472b6"];

interface PayloadItem {
  name: string;
  value: number;
  payload: Record<string, unknown>;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as { name: string; value: number; pct: number };
  if (!d) return null;
  return (
    <div
      className="rounded-xl px-3.5 py-2.5 shadow-xl border backdrop-blur-xl"
      style={{
        background: 'var(--chart-tooltip-bg)',
        borderColor: 'var(--chart-tooltip-border)',
      }}
    >
      <p className="text-[11px] font-medium text-[var(--foreground)]/70">{d.name}</p>
      <p className="text-[14px] font-mono font-semibold text-[var(--foreground)]">{fmt(d.value)}</p>
      <p className="text-[10px] text-[var(--muted)]">{d.pct.toFixed(1)}% of total</p>
    </div>
  );
}

export function IncomeBarChart({ sources, totalIncome }: IncomeBarChartProps) {
  const data = sources.map((s) => {
    const val = s.gross_amount ?? s.amount ?? 0;
    return {
      name: s.label,
      value: val,
      pct: totalIncome > 0 ? (val / totalIncome) * 100 : 0,
    };
  });

  if (data.length === 0) return null;

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
            tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--chart-cursor)", opacity: 0.8 }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={800}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
