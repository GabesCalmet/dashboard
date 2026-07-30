import { PageHeader } from "@/components/shared/page-header";
import { LessonsReportTable } from "@/components/reports/lessons-report-table";
import { requireRole } from "@/lib/auth";
import { listLessonsForTeacher } from "@/server/queries/lessons";

export default async function TeacherReportsPage() {
  const user = await requireRole("TEACHER");
  const lessons = await listLessonsForTeacher(user.teacherProfile!.id);

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Histórico de aulas dos seus alunos — marque o status de cada aula aqui."
      />
      <LessonsReportTable
        lessons={lessons}
        showStudent
        showTeacher={false}
        editableTeacherId={user.teacherProfile!.id}
      />
    </div>
  );
}
