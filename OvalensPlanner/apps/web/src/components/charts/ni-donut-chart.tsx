"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface NIDonutProps {
  class1: number;
  class2: number;
  class4: number;
  total: number;
}

const COLORS = ["#38bdf8", "#a78bfa", "#2dd4bf"];

const fmt = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface PayloadItem {
  name: string;
  value: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
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
    </div>
  );
}

export function NIDonutChart({ class1, class2, class4, total }: NIDonutProps) {
  const data = [
    ...(class1 > 0 ? [{ name: "Class 1 (Employee)", value: class1 }] : []),
    ...(class2 > 0 ? [{ name: "Class 2 (Self-employed)", value: class2 }] : []),
    ...(class4 > 0 ? [{ name: "Class 4 (Self-employed)", value: class4 }] : []),
  ];

  if (data.length === 0) return null;

  return (
    <div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={4}
              dataKey="value"
              animationBegin={100}
              animationDuration={800}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend + total */}
      <div className="space-y-1.5 mt-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
              <span className="text-[11px] text-[var(--muted)]">{d.name}</span>
            </div>
            <span className="text-[11px] font-mono text-[var(--foreground)]">{fmt(d.value)}</span>
          </div>
        ))}
        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[var(--foreground)]">Total NI</span>
          <span className="text-[13px] font-mono font-bold text-[var(--foreground)]">{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}
