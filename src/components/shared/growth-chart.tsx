"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export function GrowthChart({
  data,
}: {
  data: { month: string; aulas: number; receita: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="colorAulas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          className="text-xs fill-muted-foreground"
        />
        <YAxis tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="aulas"
          name="Aulas realizadas"
          stroke="var(--color-chart-1)"
          fill="url(#colorAulas)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="receita"
          name="Receita (R$)"
          stroke="var(--color-chart-2)"
          fill="url(#colorReceita)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
