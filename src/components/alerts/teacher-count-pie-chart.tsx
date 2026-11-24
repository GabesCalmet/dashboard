"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];
const OTHER_COLOR = "var(--color-muted-foreground)";

function CountTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; value: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{d.name}</p>
      <p className="text-muted-foreground">
        {d.value} {d.value === 1 ? "ocorrência" : "ocorrências"}
      </p>
    </div>
  );
}

// Top 5 teachers by count, the rest folded into "Outros" — a pie slice
// per individual teacher doesn't scale past the 5 colors this app's
// categorical palette actually has (see category-pie-chart.tsx, which
// does the same fold for charge categories).
export function TeacherCountPieChart({ rows }: { rows: { name: string; value: number }[] }) {
  const sorted = [...rows].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 5);
  const otherTotal = sorted.slice(5).reduce((sum, r) => sum + r.value, 0);
  const data = otherTotal > 0 ? [...top, { name: "Outros", value: otherTotal }] : top;

  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma ocorrência no mês.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          // Recharts' own default (startAngle=0, endAngle=360) starts at
          // 3 o'clock and sweeps counterclockwise, which visually scrambles
          // the slice order relative to `data` — start at 12 and sweep
          // clockwise instead, so slices render in rank order.
          startAngle={90}
          endAngle={-270}
          label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
          labelLine={false}
        >
          {data.map((d, i) => (
            <Cell key={d.name} fill={d.name === "Outros" ? OTHER_COLOR : COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CountTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
