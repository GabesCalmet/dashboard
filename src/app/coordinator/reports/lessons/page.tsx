import { PageHeader } from "@/components/shared/page-header";
import { LessonsReportTable } from "@/components/reports/lessons-report-table";
import { requireRole } from "@/lib/auth";
import { listAllLessons } from "@/server/queries/lessons";

export default async function CoordinatorLessonsReportPage() {
  await requireRole("COORDINATOR");
  const lessons = await listAllLessons();

  return (
    <div>
      <PageHeader
        title="Relatório de aulas"
        description="Todas as aulas da escola (somente leitura)."
      />
      <LessonsReportTable lessons={lessons} showStudent showTeacher />
    </div>
  );
}
