"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/labels";
import type { CategoryBreakdownRow } from "@/server/queries/financial";
import type { ChargeCategory } from "@prisma/client";

// Reuses the app's own fixed categorical chart ramp (chart-1..5, already
// used by YearlyGrowthChart).
const CATEGORY_COLOR: Record<ChargeCategory, string> = {
  STANDARD: "var(--color-chart-5)",
  BRONZE: "var(--color-chart-4)",
  SILVER: "var(--color-chart-2)",
  GOLD: "var(--color-chart-3)",
  PREMIUM: "var(--color-chart-1)",
};
// Only ever used if the server-side breakdown somehow includes an
// uncategorized row — the normal case excludes it entirely.
const NONE_COLOR = "var(--color-muted-foreground)";

function CategoryTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; value: number; avgProfit: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="font-medium">{d.name}</p>
      <p className="text-muted-foreground">
        {d.value} {d.value === 1 ? "aluno" : "alunos"}
      </p>
      <p className="text-muted-foreground">Lucro médio: {formatCurrency(d.avgProfit)}</p>
    </div>
  );
}

export function CategoryPieChart({ rows }: { rows: CategoryBreakdownRow[] }) {
  const data = rows.map((r) => ({
    name: r.label,
    value: r.studentCount,
    avgProfit: r.avgProfit,
    color: r.category ? CATEGORY_COLOR[r.category] : NONE_COLOR,
  }));
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={95}
          // Recharts' own default (startAngle=0, endAngle=360) starts at
          // 3 o'clock and sweeps counterclockwise, which visually scrambles
          // the slice order relative to `data` — this is the standard fix:
          // start at 12 and sweep clockwise, so slices render in the exact
          // order `data` is given (Standard, Bronze, Silver, Gold, Premium).
          startAngle={90}
          endAngle={-270}
          // >4 slices is past the point where every one can carry its own
          // name label without colliding — the percentage alone stays
          // readable, and the legend/tooltip carry the full name + count.
          label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
          labelLine={false}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip content={<CategoryTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
