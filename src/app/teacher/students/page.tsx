import { PageHeader } from "@/components/shared/page-header";
import { StudentsTable } from "@/components/students/students-table";
import { requireRole } from "@/lib/auth";
import { listStudentsForTeacher } from "@/server/queries/students";

export default async function TeacherStudentsPage() {
  const user = await requireRole("TEACHER");
  const students = await listStudentsForTeacher(user.teacherProfile!.id);

  const rows = students.map((s) => ({
    id: s.id,
    name: s.user.name,
    login: s.user.username ?? s.user.email,
    avatarUrl: s.user.avatarUrl,
    level: s.level,
    status: s.status,
    teacherName: s.teacher?.user.name,
    courseName: s.course?.name,
  }));

  return (
    <div>
      <PageHeader title="Meus Alunos" description={`${students.length} alunos sob sua responsabilidade`} />
      <StudentsTable rows={rows} basePath="/teacher/students" />
    </div>
  );
}
