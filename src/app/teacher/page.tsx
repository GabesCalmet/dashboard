import Link from "next/link";
import {
  Users,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock,
  BookOpen,
  Wallet,
  DollarSign,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getTeacherDashboardData } from "@/server/queries/teacher-dashboard";
import { formatDateTime, formatCurrency } from "@/lib/labels";
import { MonthNav } from "@/components/financial/month-nav";
import { parseMonthParam, monthParam } from "@/lib/month-param";

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireRole("TEACHER");
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);
  const data = await getTeacherDashboardData(user.teacherProfile!.id, { year, month });

  return (
    <div>
      <PageHeader title={`Olá, ${user.name.split(" ")[0]}`} description="Seu painel de aulas." />

      <div className="my-4 flex justify-center">
        <Button asChild size="lg" className="bg-blue-600 px-8 text-base text-white hover:bg-blue-700">
          <a
            href="https://upfrontidiomas.com.br/newportal/upfront-A1.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            <BookOpen className="size-6" /> Material didático
          </a>
        </Button>
      </div>

      <div className="mb-2 flex justify-start">
        <MonthNav basePath="/teacher" year={year} month={month} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total de alunos" value={String(data.totalStudents)} icon={Users} />
        <StatCard label="Aulas hoje" value={String(data.todayLessonsCount)} icon={CalendarCheck2} />
        <div className="space-y-4">
          <StatCard
            label="Aulas previstas (mês)"
            value={`${data.previstoHoursThisMonth.toFixed(1)}h`}
            icon={Clock}
          />
          <StatCard
            label="Aulas realizadas (mês)"
            value={String(data.completedLessonsThisMonth)}
            icon={CheckCircle2}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <StatCard
            label="Pagamento previsto (mês)"
            value={formatCurrency(data.payrollPrevisto)}
            icon={Wallet}
            href={`/teacher/payroll?month=${monthParam(year, month)}`}
          />
          <StatCard
            label="Pagamento realizado (mês)"
            value={formatCurrency(data.payrollRealizado)}
            icon={DollarSign}
            accent
            href={`/teacher/payroll?month=${monthParam(year, month)}`}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4" /> Próximas aulas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.upcomingLessons.map((l) => (
              <Link
                key={l.id}
                href={`/teacher/students/${l.studentId}`}
                className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-secondary"
              >
                <span>{l.student.user.name}</span>
                <Badge variant="secondary">{formatDateTime(l.scheduledAt)}</Badge>
              </Link>
            ))}
            {data.upcomingLessons.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma aula futura agendada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
