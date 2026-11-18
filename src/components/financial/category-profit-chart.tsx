"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer } from "recharts";
import { formatCurrency, chargeCategoryChartColor } from "@/lib/labels";
import type { CategoryBreakdownRow } from "@/server/queries/financial";

// How much higher one tier's average profit is than another, at a
// glance — same category colors as CategoryPieChart (identity already
// established there), so no axis labels/legend repeat the tier names
// here; this chart is purely about comparing bar height.
function ProfitTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; avgProfit: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="font-medium">{d.name}</p>
      <p className="text-muted-foreground">Lucro médio: {formatCurrency(d.avgProfit)}</p>
    </div>
  );
}

export function CategoryProfitChart({ rows }: { rows: CategoryBreakdownRow[] }) {
  const data = rows.map((r) => ({
    name: r.label,
    avgProfit: r.avgProfit,
    color: r.category ? chargeCategoryChartColor[r.category] : "var(--color-muted-foreground)",
  }));
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={false} />
        <YAxis tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
        <Tooltip content={<ProfitTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="avgProfit" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
          <LabelList
            dataKey="avgProfit"
            position="top"
            formatter={(value: unknown) => formatCurrency(Number(value))}
            className="fill-foreground text-[10px]"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
