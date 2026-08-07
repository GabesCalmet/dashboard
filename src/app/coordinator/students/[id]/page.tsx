import { notFound } from "next/navigation";
import { StudentDetailView } from "@/components/students/student-detail";
import {
  getStudentDetail,
  listActiveTeachersForSelect,
  listCoursesForSelect,
  listPlansForSelect,
} from "@/server/queries/students";
import { parseMonthParam } from "@/lib/month-param";

export default async function CoordinatorStudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id } = await params;
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);
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
      monthNav={{ year, month, selfPath: `/coordinator/students/${id}` }}
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
