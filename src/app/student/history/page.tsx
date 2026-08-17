import { Percent, CalendarCheck2, Clock, XCircle, Repeat } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { LessonHistoryTable } from "@/components/students/lesson-history-table";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentStats } from "@/server/queries/student-stats";

export default async function StudentHistoryPage() {
  const user = await requireRole("STUDENT");
  const studentId = user.studentProfile!.id;

  const [lessons, stats] = await Promise.all([
    prisma.lesson.findMany({
      where: { studentId },
      orderBy: { scheduledAt: "asc" },
      include: { rescheduledTo: true },
    }),
    getStudentStats(studentId),
  ]);

  const totals = stats.monthly.reduce(
    (acc, m) => ({
      aulas: acc.aulas + m.aulas,
      horas: acc.horas + m.horas,
      cancelamentos: acc.cancelamentos + m.cancelamentos,
      reposicoes: acc.reposicoes + m.reposicoes,
    }),
    { aulas: 0, horas: 0, cancelamentos: 0, reposicoes: 0 }
  );

  return (
    <div>
      <PageHeader title="Histórico de Aulas" description="Todas as suas aulas e estatísticas de estudo." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Frequência" value={`${stats.attendanceRate}%`} icon={Percent} accent />
        <StatCard label="Aulas (6 meses)" value={String(totals.aulas)} icon={CalendarCheck2} />
        <StatCard label="Horas estudadas (6 meses)" value={`${totals.horas.toFixed(1)}h`} icon={Clock} />
        <StatCard label="Cancelamentos (6 meses)" value={String(totals.cancelamentos)} icon={XCircle} />
        <StatCard label="Reposições (6 meses)" value={String(totals.reposicoes)} icon={Repeat} />
      </div>

      <LessonHistoryTable lessons={lessons} />
    </div>
  );
}
