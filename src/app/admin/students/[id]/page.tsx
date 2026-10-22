import { notFound } from "next/navigation";
import { StudentDetailView } from "@/components/students/student-detail";
import {
  getStudentDetail,
  listActiveTeachersForSelect,
  listCoursesForSelect,
  listPlansForSelect,
} from "@/server/queries/students";
import { getAuditTrail } from "@/server/audit";
import { getStudentPaymentHistory, listStudentCharges } from "@/server/queries/financial";
import { parseMonthParam } from "@/lib/month-param";

export default async function AdminStudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { month: monthParamValue, tab } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);
  const [student, teachers, courses, plans, audit, paymentHistory, charges] = await Promise.all([
    getStudentDetail(id),
    listActiveTeachersForSelect(),
    listCoursesForSelect(),
    listPlansForSelect(),
    getAuditTrail("StudentProfile", id),
    getStudentPaymentHistory(id),
    listStudentCharges(id),
  ]);

  if (!student) notFound();

  return (
    <StudentDetailView
      student={student}
      basePath="/admin/students"
      monthNav={{ year, month, selfPath: `/admin/students/${id}` }}
      paymentHistory={paymentHistory}
      charges={charges.map((c) => ({
        id: c.id,
        payerName: c.payerName,
        description: c.description,
        amount: Number(c.amount),
        frequency: c.frequency,
        date: c.date,
        dueDay: c.dueDay,
        endDate: c.endDate,
        bankAccount: c.bankAccount,
      }))}
      initialTab={tab}
      permissions={{
        canEdit: true,
        canDelete: true,
        canManageLevel: true,
        canPromote: true,
        showFinancial: true,
        showAudit: true,
        canEditLessons: true,
        canEditLessonDetails: true,
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
