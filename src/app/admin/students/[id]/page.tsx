import { notFound } from "next/navigation";
import { StudentDetailView } from "@/components/students/student-detail";
import {
  getStudentDetail,
  listActiveTeachersForSelect,
  listCoursesForSelect,
  listPlansForSelect,
} from "@/server/queries/students";
import { getAuditTrail } from "@/server/audit";
import { getStudentPaymentHistory } from "@/server/queries/financial";
import { parseMonthParam } from "@/lib/month-param";

export default async function AdminStudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id } = await params;
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);
  const [student, teachers, courses, plans, audit, paymentHistory] = await Promise.all([
    getStudentDetail(id),
    listActiveTeachersForSelect(),
    listCoursesForSelect(),
    listPlansForSelect(),
    getAuditTrail("StudentProfile", id),
    getStudentPaymentHistory(id),
  ]);

  if (!student) notFound();

  return (
    <StudentDetailView
      student={student}
      basePath="/admin/students"
      monthNav={{ year, month, selfPath: `/admin/students/${id}` }}
      paymentHistory={paymentHistory}
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
