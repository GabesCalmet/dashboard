import Link from "next/link";
import { Users, GraduationCap, CalendarCheck2, CalendarClock, CheckCircle2, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getTeacherDashboardData } from "@/server/queries/teacher-dashboard";
import { formatDateTime } from "@/lib/labels";
import { LessonStatusSelect } from "@/components/lessons/lesson-status-select";

export default async function TeacherDashboardPage() {
  const user = await requireRole("TEACHER");
  const data = await getTeacherDashboardData(user.teacherProfile!.id);

  return (
    <div>
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        description="Seu painel de aulas."
        actions={
          <Button asChild variant="outline">
            <a
              href="https://upfrontidiomas.com.br/newportal/upfront-A1.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              <BookOpen /> Material didático
            </a>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de alunos" value={String(data.totalStudents)} icon={Users} />
        <StatCard label="Alunos ativos" value={String(data.activeStudents)} icon={GraduationCap} accent />
        <StatCard label="Aulas hoje" value={String(data.todayLessons.length)} icon={CalendarCheck2} />
        <StatCard
          label="Aulas realizadas (mês)"
          value={String(data.completedLessonsThisMonth)}
          icon={CheckCircle2}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aulas de hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.todayLessons.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-secondary"
              >
                <Link href={`/teacher/students/${l.studentId}`} className="min-w-0 flex-1">
                  <p className="truncate">{l.student.user.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(l.scheduledAt)}</p>
                </Link>
                <LessonStatusSelect lessonId={l.id} status={l.status} />
              </div>
            ))}
            {data.todayLessons.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma aula agendada para hoje.
              </p>
            )}
          </CardContent>
        </Card>

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
