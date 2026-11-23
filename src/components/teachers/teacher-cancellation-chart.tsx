"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type Row = { teacherName: string; cancellationRate: number; makeupRate: number };

function RateTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{d.teacherName}</p>
      <p className="text-muted-foreground">Cancelamentos: {d.cancellationRate.toFixed(1)}%</p>
      <p className="text-muted-foreground">Reposições: {d.makeupRate.toFixed(1)}%</p>
    </div>
  );
}

// Rates (% of that teacher's own lessons that month), not raw counts — a
// raw count mostly just tracks how many students a teacher has, which
// isn't what "who's cancelling a lot" needs to compare fairly.
export function TeacherCancellationChart({ rows }: { rows: Row[] }) {
  const height = Math.max(220, rows.length * 34);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis
          type="number"
          tickFormatter={(v: number) => `${v}%`}
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
        <Tooltip content={<RateTooltip />} cursor={{ fill: "var(--secondary)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="cancellationRate" name="Cancelamentos" fill="var(--color-destructive)" radius={[0, 4, 4, 0]} maxBarSize={14} />
        <Bar dataKey="makeupRate" name="Reposições" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}
