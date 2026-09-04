import { PageHeader } from "@/components/shared/page-header";
import { StudentsTable } from "@/components/students/students-table";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import {
  listStudents,
  listActiveTeachersForSelect,
  listCoursesForSelect,
  listPlansForSelect,
} from "@/server/queries/students";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [students, teachers, courses, plans] = await Promise.all([
    listStudents(),
    listActiveTeachersForSelect(),
    listCoursesForSelect(),
    listPlansForSelect(),
  ]);

  const rows = students.map((s) => {
    const memberNames = s.groupMembers.map((m) => m.user.name);
    return {
      id: s.id,
      name: s.groupName ?? s.user.name,
      login: s.user.username ?? s.user.email,
      avatarUrl: s.user.avatarUrl,
      level: s.level,
      status: s.status,
      teacherName: s.teacher?.user.name,
      courseName: s.course?.name,
      searchNames: [s.user.name, s.groupName, ...memberNames].filter((n): n is string => Boolean(n)),
      groupMemberNames: s.groupName ? [s.user.name, ...memberNames] : memberNames,
    };
  });

  return (
    <div>
      <PageHeader
        title="Alunos"
        description={`${students.length} alunos cadastrados`}
        actions={
          <StudentFormDialog
            teachers={teachers.map((t) => ({ id: t.id, label: t.user.name }))}
            courses={courses.map((c) => ({ id: c.id, label: c.name }))}
            plans={plans.map((p) => ({ id: p.id, label: p.name }))}
          />
        }
      />
      <StudentsTable
        rows={rows}
        basePath="/admin/students"
        initialStatus={["ACTIVE", "PAUSED", "CANCELED"].includes(status ?? "") ? status : "all"}
      />
    </div>
  );
}
