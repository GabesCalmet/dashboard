"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/labels";

type Row = { teacherName: string; realizado: number; shareOfTotal: number };

function RevenueTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{d.teacherName}</p>
      <p className="text-muted-foreground">{formatCurrency(d.realizado)}</p>
      <p className="text-muted-foreground">{d.shareOfTotal.toFixed(1)}% do total pago</p>
    </div>
  );
}

// Ranked horizontal bars, largest first, one hue — the right-shaped chart
// for comparing many parts against each other (see the dataviz skill's
// "Part-to-whole — which bar" table: >6 parts calls for ranked bars, not a
// pie/donut, which would need as many colors as there are teachers).
// Each bar's % of the total realizado doubles this as the "pay
// distribution" view — no separate chart needed for that.
export function TeacherRevenueChart({ rows }: { rows: Row[] }) {
  const height = Math.max(220, rows.length * 34);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatCurrency(v)}
          tickLine={false}
          axisLine={false}
          className="text-xs fill-muted-foreground"
        />
        <YAxis
          type="category"
          dataKey="teacherName"
          width={110}
          tickLine={false}
          axisLine={false}
          className="text-xs fill-muted-foreground"
        />
        <Tooltip content={<RevenueTooltip />} cursor={{ fill: "var(--secondary)" }} />
        <Bar dataKey="realizado" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
