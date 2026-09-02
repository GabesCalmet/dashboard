import {
  GraduationCap,
  PauseCircle,
  UserX,
  UsersRound,
  CalendarCheck2,
  Clock,
  Ban,
  Repeat,
  Wallet,
  TrendingUp,
  Receipt,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GrowthChart } from "@/components/shared/growth-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthNav } from "@/components/financial/month-nav";
import { getAdminDashboardData } from "@/server/queries/dashboard";
import { getAttendanceAlerts } from "@/server/queries/alerts";
import { formatCurrency } from "@/lib/labels";
import { monthParam, parseMonthParam } from "@/lib/month-param";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);
  const [data, alerts] = await Promise.all([
    getAdminDashboardData({ year, month }),
    getAttendanceAlerts(),
  ]);
  const hasRedAlert = alerts.some((a) => a.severity === "RED");
  const viewedMonth = monthParam(year, month);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral da Upfront English School."
      />

      <div className="mb-4">
        <MonthNav basePath="/admin" year={year} month={month} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Alunos ativos"
          value={String(data.activeStudents)}
          icon={GraduationCap}
          accent
          href="/admin/students?status=ACTIVE"
        />
        <StatCard
          label="Alunos pausados"
          value={String(data.pausedStudents)}
          icon={PauseCircle}
          href="/admin/students?status=PAUSED"
        />
        <StatCard
          label="Alunos cancelados"
          value={String(data.canceledStudents)}
          icon={UserX}
          href="/admin/students?status=CANCELED"
        />
        <StatCard
          label="Professores"
          value={String(data.totalTeachers)}
          icon={UsersRound}
          href="/admin/teachers"
        />

        <StatCard
          label="Aulas realizadas (mês)"
          value={String(data.lessonsThisMonth)}
          icon={CalendarCheck2}
        />
        <StatCard label="Horas lecionadas (mês)" value={`${data.hoursTaught}h`} icon={Clock} />
        <StatCard
          label="Cancelamentos (mês)"
          value={String(data.cancellationsThisMonth)}
          icon={Ban}
          href={`/admin/reports/lessons?month=${viewedMonth}&statuses=CANCELED_BY_STUDENT,CANCELED_BY_TEACHER,CANCELED_HOLIDAY,NO_SHOW`}
        />
        <StatCard
          label="Reposições (mês)"
          value={String(data.makeupsThisMonth)}
          icon={Repeat}
          href={`/admin/reports/lessons?month=${viewedMonth}&statuses=MAKEUP`}
        />
        <StatCard
          label="Alertas de frequência"
          value={String(alerts.length)}
          icon={AlertTriangle}
          tone={alerts.length === 0 ? undefined : hasRedAlert ? "danger" : "warning"}
          href="/admin/alerts"
        />

        <StatCard
          label="Receita mensal"
          value={formatCurrency(data.monthlyRevenue)}
          icon={Wallet}
          accent
        />
        <StatCard label="Receita anual" value={formatCurrency(data.annualRevenue)} icon={TrendingUp} />
        <StatCard label="Ticket médio" value={formatCurrency(data.avgTicket)} icon={Receipt} />
        <StatCard
          label="Aulas/aluno (média)"
          value={data.avgLessonsPerStudent.toFixed(1)}
          icon={BarChart3}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="capitalize">Crescimento — 6 meses até {monthLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <GrowthChart data={data.growth} />
        </CardContent>
      </Card>
    </div>
  );
}
