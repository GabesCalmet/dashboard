import {
  Users,
  GraduationCap,
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
import { getAdminDashboardData } from "@/server/queries/dashboard";
import { getAttendanceAlerts } from "@/server/queries/alerts";
import { formatCurrency } from "@/lib/labels";

export default async function AdminDashboardPage() {
  const [data, alerts] = await Promise.all([getAdminDashboardData(), getAttendanceAlerts()]);
  const hasRedAlert = alerts.some((a) => a.severity === "RED");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral da Upfront English School."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de alunos" value={String(data.totalStudents)} icon={Users} />
        <StatCard
          label="Alunos ativos"
          value={String(data.activeStudents)}
          icon={GraduationCap}
          accent
        />
        <StatCard label="Alunos cancelados" value={String(data.canceledStudents)} icon={UserX} />
        <StatCard label="Professores" value={String(data.totalTeachers)} icon={UsersRound} />

        <StatCard
          label="Aulas realizadas (mês)"
          value={String(data.lessonsThisMonth)}
          icon={CalendarCheck2}
        />
        <StatCard label="Horas lecionadas (mês)" value={`${data.hoursTaught}h`} icon={Clock} />
        <StatCard label="Cancelamentos (mês)" value={String(data.cancellationsThisMonth)} icon={Ban} />
        <StatCard label="Reposições (mês)" value={String(data.makeupsThisMonth)} icon={Repeat} />
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
          <CardTitle>Crescimento — últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <GrowthChart data={data.growth} />
        </CardContent>
      </Card>
    </div>
  );
}
