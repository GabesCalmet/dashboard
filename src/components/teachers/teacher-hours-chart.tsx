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

type Row = { teacherName: string; hoursTaught: number };

function HoursTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{d.teacherName}</p>
      <p className="text-muted-foreground">{d.hoursTaught.toFixed(1)}h lecionadas</p>
    </div>
  );
}

// Same ranked-horizontal-bar shape as the revenue chart, but hours and R$
// are different units/scales — a separate chart, never a second axis.
export function TeacherHoursChart({ rows }: { rows: Row[] }) {
  const height = Math.max(220, rows.length * 34);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis
          type="number"
          tickFormatter={(v: number) => `${v}h`}
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
        <Tooltip content={<HoursTooltip />} cursor={{ fill: "var(--secondary)" }} />
        <Bar dataKey="hoursTaught" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
