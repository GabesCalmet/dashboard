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

export function CashFlowChart({
  data,
}: {
  data: { month: string; recebido: number; previsto: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
        <YAxis tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="previsto" name="Previsto" fill="var(--color-chart-5)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="recebido" name="Recebido" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
