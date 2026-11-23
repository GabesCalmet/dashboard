"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

// A single series needs no legend box — the card's own title already says
// what's plotted.
export function TeacherActiveStudentsChart({
  data,
}: {
  data: { month: string; activeStudents: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="activeStudents"
          name="Alunos"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
