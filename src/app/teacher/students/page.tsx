import { PageHeader } from "@/components/shared/page-header";
import { StudentsTable } from "@/components/students/students-table";
import { requireRole } from "@/lib/auth";
import { listStudentsForTeacher } from "@/server/queries/students";

export default async function TeacherStudentsPage() {
  const user = await requireRole("TEACHER");
  const students = await listStudentsForTeacher(user.teacherProfile!.id);

  const rows = students.map((s) => {
    const memberNames = s.groupMembers.map((m) => m.user.name);
    return {
      id: s.id,
      name: s.user.name,
      login: s.user.username ?? s.user.email,
      avatarUrl: s.user.avatarUrl,
      level: s.level,
      status: s.status,
      teacherName: s.teacher?.user.name,
      courseName: s.course?.name,
      searchNames: [s.user.name, s.groupName, ...memberNames].filter((n): n is string => Boolean(n)),
      groupMemberNames: memberNames,
    };
  });

  return (
    <div>
      <PageHeader title="Meus Alunos" description={`${students.length} alunos sob sua responsabilidade`} />
      <StudentsTable rows={rows} basePath="/teacher/students" />
    </div>
  );
}
