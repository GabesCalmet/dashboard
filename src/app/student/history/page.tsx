import { Percent } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { LessonHistoryTable } from "@/components/students/lesson-history-table";
import { StudentStatsCharts } from "@/components/students/student-stats-charts";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentStats } from "@/server/queries/student-stats";

export default async function StudentHistoryPage() {
  const user = await requireRole("STUDENT");
  const studentId = user.studentProfile!.id;

  const [lessons, stats] = await Promise.all([
    prisma.lesson.findMany({
      where: { studentId },
      orderBy: { scheduledAt: "desc" },
      include: { rescheduledTo: true },
    }),
    getStudentStats(studentId),
  ]);

  return (
    <div>
      <PageHeader title="Histórico de Aulas" description="Todas as suas aulas e estatísticas de estudo." />

      <div className="mb-6">
        <StatCard label="Frequência" value={`${stats.attendanceRate}%`} icon={Percent} accent />
      </div>

      <div className="mb-6">
        <StudentStatsCharts monthly={stats.monthly} />
      </div>

      <LessonHistoryTable lessons={lessons} />
    </div>
  );
}
