import { PageHeader } from "@/components/shared/page-header";
import { StudentsTable } from "@/components/students/students-table";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import {
  listStudents,
  listActiveTeachersForSelect,
  listCoursesForSelect,
  listPlansForSelect,
} from "@/server/queries/students";

export default async function CoordinatorStudentsPage() {
  const [students, teachers, courses, plans] = await Promise.all([
    listStudents(),
    listActiveTeachersForSelect(),
    listCoursesForSelect(),
    listPlansForSelect(),
  ]);

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
      <StudentsTable rows={rows} basePath="/coordinator/students" />
    </div>
  );
}
