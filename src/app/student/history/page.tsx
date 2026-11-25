import { Percent, CalendarCheck2, Clock, XCircle, Repeat } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { LessonHistoryTable } from "@/components/students/lesson-history-table";
import { MonthlyReportButton } from "@/components/students/monthly-report-button";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { brazilToday } from "@/lib/timezone";
import { getStudentStats } from "@/server/queries/student-stats";

export default async function StudentHistoryPage() {
  const user = await requireRole("STUDENT");
  const studentId = user.studentProfile!.id;
  const now = brazilToday();

  const [lessons, stats] = await Promise.all([
    prisma.lesson.findMany({
      where: { studentId },
      orderBy: { scheduledAt: "asc" },
      include: { rescheduledTo: true },
    }),
    getStudentStats(studentId),
  ]);

  const { totals } = stats;

  return (
    <div>
      <PageHeader title="Histórico de Aulas" description="Todas as suas aulas e estatísticas de estudo." />

      <div className="mb-6">
        <MonthlyReportButton
          href={`/student/history/report?year=${now.getFullYear()}&month=${now.getMonth()}`}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Frequência" value={`${stats.attendanceRate}%`} icon={Percent} accent />
        <StatCard label="Aulas (ano)" value={String(totals.aulas)} icon={CalendarCheck2} />
        <StatCard label="Horas estudadas (ano)" value={`${totals.horas.toFixed(1)}h`} icon={Clock} />
        <StatCard label="Cancelamentos (ano)" value={String(totals.cancelamentos)} icon={XCircle} />
        <StatCard label="Reposições (ano)" value={String(totals.reposicoes)} icon={Repeat} />
      </div>

      <LessonHistoryTable lessons={lessons} />
    </div>
  );
}
