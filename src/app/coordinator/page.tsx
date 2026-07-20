import { Users, GraduationCap, UsersRound, CalendarCheck2, Ban, Repeat } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GrowthChart } from "@/components/shared/growth-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardData } from "@/server/queries/dashboard";

export default async function CoordinatorDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral acadêmica da escola." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de alunos" value={String(data.totalStudents)} icon={Users} />
        <StatCard label="Alunos ativos" value={String(data.activeStudents)} icon={GraduationCap} accent />
        <StatCard label="Professores" value={String(data.totalTeachers)} icon={UsersRound} />
        <StatCard label="Aulas realizadas (mês)" value={String(data.lessonsThisMonth)} icon={CalendarCheck2} />
        <StatCard label="Cancelamentos (mês)" value={String(data.cancellationsThisMonth)} icon={Ban} />
        <StatCard label="Reposições (mês)" value={String(data.makeupsThisMonth)} icon={Repeat} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Aulas realizadas — últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <GrowthChart data={data.growth} />
        </CardContent>
      </Card>
    </div>
  );
}
