"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

type Row = { name: string; value: number };

function CountTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
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

// Ranked horizontal bars, every teacher with at least one occurrence —
// the name sits right next to its own bar, so there's no legend to
// cross-reference and no ceiling on how many teachers can show at once,
// unlike a pie (which needs as many colors as there are slices).
export function TeacherCountBarChart({ rows }: { rows: Row[] }) {
  const sorted = [...rows].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);

  if (sorted.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma ocorrência no mês.</p>;
  }

  const height = Math.max(180, sorted.length * 32);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis
          type="number"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          className="text-xs fill-muted-foreground"
        />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tickLine={false}
          axisLine={false}
          className="text-xs fill-muted-foreground"
        />
        <Tooltip content={<CountTooltip />} cursor={{ fill: "var(--secondary)" }} />
        <Bar dataKey="value" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
