"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/labels";

export function TeacherPayTrendChart({
  data,
}: {
  data: { month: string; previsto: number; realizado: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
        <YAxis
          tickFormatter={(v: number) => formatCurrency(v)}
          tickLine={false}
          axisLine={false}
          className="text-xs fill-muted-foreground"
        />
        <Tooltip
          formatter={(value: unknown) => formatCurrency(Number(value))}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="previsto" name="Previsto" stroke="var(--color-chart-5)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="realizado" name="Acumulado" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
