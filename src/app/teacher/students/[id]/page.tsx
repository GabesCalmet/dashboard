import { notFound } from "next/navigation";
import { StudentDetailView } from "@/components/students/student-detail";
import { requireRole } from "@/lib/auth";
import { getStudentDetail } from "@/server/queries/students";

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("TEACHER");
  const { id } = await params;
  const student = await getStudentDetail(id);

  if (!student || student.teacherId !== user.teacherProfile?.id) notFound();

  return (
    <StudentDetailView
      student={student}
      basePath="/teacher/students"
      permissions={{
        canEdit: false,
        canDelete: false,
        canManageLevel: false,
        canPromote: false,
        showFinancial: false,
        showAudit: false,
      }}
    />
  );
}
