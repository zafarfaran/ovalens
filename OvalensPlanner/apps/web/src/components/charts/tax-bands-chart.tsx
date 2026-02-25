"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface TaxBand {
  band: string;
  amount: number;
  rate: number;
  tax: number;
}

interface TaxBandsChartProps {
  bands: TaxBand[];
}

const fmt = (n: number) =>
  `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

interface PayloadItem {
  name: string;
  value: number;
  dataKey: string;
  payload: { band: string; rate: string };
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: PayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3.5 py-2.5 shadow-xl border backdrop-blur-xl"
      style={{
        background: 'var(--chart-tooltip-bg)',
        borderColor: 'var(--chart-tooltip-border)',
      }}
    >
      <p className="text-[11px] font-medium text-[var(--foreground)]/70 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[12px] font-mono text-[var(--foreground)]">
          <span className="text-[var(--muted)]">{p.name}: </span>{fmt(p.value)}
        </p>
      ))}
      {payload[0]?.payload?.rate && (
        <p className="text-[10px] text-[var(--muted)] mt-1">Rate: {payload[0].payload.rate}</p>
      )}
    </div>
  );
}

export function TaxBandsChart({ bands }: TaxBandsChartProps) {
  const data = bands.map((b) => ({
    band: b.band,
    income: b.amount,
    tax: b.tax,
    rate: `${(b.rate * 100).toFixed(0)}%`,
  }));

  if (data.length === 0) return null;

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
          <XAxis
            dataKey="band"
            tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
            tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--chart-cursor)", opacity: 0.8 }} />
          <Legend
            verticalAlign="top"
            height={30}
            formatter={(value: string) => (
              <span className="text-[11px] text-[var(--muted)]">{value}</span>
            )}
          />
          <Bar dataKey="income" name="Income in Band" fill="#748ffc" fillOpacity={0.75} radius={[4, 4, 0, 0]} animationDuration={800} />
          <Bar dataKey="tax" name="Tax" fill="#f87171" fillOpacity={0.8} radius={[4, 4, 0, 0]} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
