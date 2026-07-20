"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

export function StudentStatsCharts({
  monthly,
}: {
  monthly: { month: string; aulas: number; horas: number; cancelamentos: number; reposicoes: number }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard title="Aulas por mês">
        <BarChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
          <YAxis tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="aulas" name="Aulas" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Horas estudadas">
        <LineChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
          <YAxis tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="horas" name="Horas" stroke="var(--color-chart-2)" strokeWidth={2} />
        </LineChart>
      </ChartCard>

      <ChartCard title="Cancelamentos">
        <BarChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
          <YAxis tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="cancelamentos" name="Cancelamentos" fill="var(--color-chart-4)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Reposições">
        <BarChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
          <YAxis tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="reposicoes" name="Reposições" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-2 text-sm font-medium">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
