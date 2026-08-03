import { notFound } from "next/navigation";
import { StudentDetailView } from "@/components/students/student-detail";
import {
  getStudentDetail,
  listActiveTeachersForSelect,
  listCoursesForSelect,
  listPlansForSelect,
} from "@/server/queries/students";
import { getAuditTrail } from "@/server/audit";

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [student, teachers, courses, plans, audit] = await Promise.all([
    getStudentDetail(id),
    listActiveTeachersForSelect(),
    listCoursesForSelect(),
    listPlansForSelect(),
    getAuditTrail("StudentProfile", id),
  ]);

  if (!student) notFound();

  return (
    <StudentDetailView
      student={student}
      basePath="/admin/students"
      permissions={{
        canEdit: true,
        canDelete: true,
        canManageLevel: true,
        canPromote: true,
        showFinancial: true,
        showAudit: true,
        canEditLessons: true,
      }}
      editOptions={{
        teachers: teachers.map((t) => ({ id: t.id, label: t.user.name })),
        courses: courses.map((c) => ({ id: c.id, label: c.name })),
        plans: plans.map((p) => ({ id: p.id, label: p.name })),
      }}
      auditEntries={audit}
    />
  );
}
