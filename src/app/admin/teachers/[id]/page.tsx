import { notFound } from "next/navigation";
import { TeacherDetailView } from "@/components/teachers/teacher-detail";
import { getTeacherDetail, getTeacherMonthlyTrend } from "@/server/queries/teachers";

export default async function AdminTeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await getTeacherDetail(id);
  if (!teacher) notFound();
  const trend = await getTeacherMonthlyTrend(id);

  return (
    <TeacherDetailView
      teacher={teacher}
      trend={trend}
      basePath="/admin/teachers"
      studentsBasePath="/admin/students"
      canManage
    />
  );
}
