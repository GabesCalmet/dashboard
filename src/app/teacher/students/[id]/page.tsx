import { notFound } from "next/navigation";
import { StudentDetailView } from "@/components/students/student-detail";
import { requireRole } from "@/lib/auth";
import { getStudentDetail } from "@/server/queries/students";
import { parseMonthParam } from "@/lib/month-param";

export default async function TeacherStudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireRole("TEACHER");
  const { id } = await params;
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);
  const student = await getStudentDetail(id);

  if (!student || student.teacherId !== user.teacherProfile?.id) notFound();

  return (
    <StudentDetailView
      student={student}
      basePath="/teacher/students"
      monthNav={{ year, month, selfPath: `/teacher/students/${id}` }}
      permissions={{
        canEdit: false,
        canDelete: false,
        canManageLevel: false,
        canPromote: false,
        showFinancial: false,
        showAudit: false,
        canEditLessons: true,
        showOverview: false,
      }}
    />
  );
}
