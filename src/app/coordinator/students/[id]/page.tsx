import { notFound } from "next/navigation";
import { StudentDetailView } from "@/components/students/student-detail";
import {
  getStudentDetail,
  listActiveTeachersForSelect,
  listCoursesForSelect,
  listPlansForSelect,
} from "@/server/queries/students";

export default async function CoordinatorStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [student, teachers, courses, plans] = await Promise.all([
    getStudentDetail(id),
    listActiveTeachersForSelect(),
    listCoursesForSelect(),
    listPlansForSelect(),
  ]);

  if (!student) notFound();

  return (
    <StudentDetailView
      student={student}
      basePath="/coordinator/students"
      permissions={{
        canEdit: true,
        canDelete: false,
        canManageLevel: true,
        canPromote: false,
        showFinancial: false,
        showAudit: false,
      }}
      editOptions={{
        teachers: teachers.map((t) => ({ id: t.id, label: t.user.name })),
        courses: courses.map((c) => ({ id: c.id, label: c.name })),
        plans: plans.map((p) => ({ id: p.id, label: p.name })),
      }}
    />
  );
}
